import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import webPush from 'web-push';
import { Project } from './models/Project.js';
import { Handler } from './models/Handler.js';
import { Account } from './models/Account.js';
import { VideoPost } from './models/VideoPost.js';
import { getPresignedUploadUrl, getR2Object, countR2Videos, R2_PUBLIC_URL } from './r2Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.on('exit', (code) => console.log('Process exiting with code', code));

// Load environment variables from the project root .env file
dotenv.config();
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// --- Web Push / VAPID setup ---
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@thethousandways.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// --- Notification endpoints ---

// Save a push subscription for a handler
app.post('/api/notifications/subscribe', async (req, res) => {
  try {
    const { handlerId, subscription } = req.body;
    if (!handlerId || !subscription?.endpoint) {
      return res.status(400).json({ error: 'handlerId and subscription are required' });
    }
    const handler = await Handler.findOne({ handleId: handlerId, uid: 'default_user' });
    if (!handler) return res.status(404).json({ error: 'Handler not found' });

    // Avoid duplicate endpoints
    const exists = handler.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      handler.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      });
    }
    handler.notificationsEnabled = true;
    await handler.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a push subscription (unsubscribe)
app.post('/api/notifications/unsubscribe', async (req, res) => {
  try {
    const { handlerId, endpoint } = req.body;
    if (!handlerId) return res.status(400).json({ error: 'handlerId is required' });
    const handler = await Handler.findOne({ handleId: handlerId, uid: 'default_user' });
    if (!handler) return res.status(404).json({ error: 'Handler not found' });

    handler.pushSubscriptions = handler.pushSubscriptions.filter(s => s.endpoint !== endpoint);
    if (handler.pushSubscriptions.length === 0) handler.notificationsEnabled = false;
    await handler.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update notification times for a handler
app.patch('/api/notifications/times', async (req, res) => {
  try {
    const { handlerId, times } = req.body; // times: ["09:00", "18:00"]
    if (!handlerId || !Array.isArray(times)) {
      return res.status(400).json({ error: 'handlerId and times[] are required' });
    }
    const handler = await Handler.findOneAndUpdate(
      { handleId: handlerId, uid: 'default_user' },
      { notificationTimes: times },
      { new: true }
    );
    if (!handler) return res.status(404).json({ error: 'Handler not found' });
    res.json({ ok: true, notificationTimes: handler.notificationTimes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expose VAPID public key to the client
app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Cron endpoint — called by Vercel cron (or external cron) to send posting reminders
// Vercel cron hits this with a GET request; guard with CRON_SECRET header
app.get('/api/cron/notify', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Current hour in IST (UTC+5:30)
    const nowUTC = new Date();
    const istOffset = 5 * 60 + 30; // minutes
    const istMs = nowUTC.getTime() + istOffset * 60 * 1000;
    const istDate = new Date(istMs);
    const currentHour = String(istDate.getUTCHours()).padStart(2, '0');
    const currentHHMM = `${currentHour}:00`;

    // Find handlers that have this hour in their schedule
    const handlers = await Handler.find({
      notificationsEnabled: true,
      notificationTimes: currentHHMM,
      'pushSubscriptions.0': { $exists: true },
    });

    const payload = JSON.stringify({
      title: 'Time to Post! 🎬',
      body: 'Your scheduled posting time is now. Open TW to get started.',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      url: '/',
    });

    let sent = 0;
    let failed = 0;

    for (const handler of handlers) {
      const deadEndpoints = [];
      for (const sub of handler.pushSubscriptions) {
        try {
          await webPush.sendNotification(sub, payload);
          sent++;
        } catch (err) {
          failed++;
          // 410 Gone = subscription is no longer valid, clean it up
          if (err.statusCode === 410 || err.statusCode === 404) {
            deadEndpoints.push(sub.endpoint);
          }
        }
      }
      if (deadEndpoints.length > 0) {
        handler.pushSubscriptions = handler.pushSubscriptions.filter(
          s => !deadEndpoints.includes(s.endpoint)
        );
        await handler.save();
      }
    }

    res.json({ ok: true, handlersNotified: handlers.length, sent, failed, currentHour: currentHHMM });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Projects ---
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({ uid: 'default_user' });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = new Project({ ...req.body, uid: 'default_user' });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Handlers ---
app.get('/api/handlers', async (req, res) => {
  try {
    const handlers = await Handler.find({ uid: 'default_user' });
    res.json(handlers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/handlers', async (req, res) => {
  try {
    const handler = new Handler({ ...req.body, uid: 'default_user' });
    await handler.save();
    res.status(201).json(handler);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/handlers/:id', async (req, res) => {
  try {
    await Handler.findByIdAndDelete(req.params.id);
    // Optionally remove handlerId from assigned accounts
    await Account.updateMany({ handlerId: req.params.id }, { $unset: { handlerId: "" } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/handlers/:id', async (req, res) => {
  try {
    const handler = await Handler.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!handler) return res.status(404).json({ error: 'Handler not found' });
    res.json(handler);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Accounts ---
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find({ uid: 'default_user' });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const account = new Account({ ...req.body, uid: 'default_user' });
    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- R2 Video Upload ---

// Helper to get the bucket folder name from account (handles full URLs in r2Prefix)
const getFolderPrefix = (account) => {
  if (account.r2Prefix && account.r2Prefix.startsWith('http')) {
    try {
      const url = new URL(account.r2Prefix);
      // Remove leading slash and trailing slash for the prefix
      return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    } catch (e) {
      return account.r2Prefix;
    }
  }
  return account.r2Prefix || account.username;
};

// Helper to get the public base URL for videos
const getPublicBaseUrl = (account) => {
  if (account.r2Prefix && account.r2Prefix.startsWith('http')) {
    return account.r2Prefix.replace(/\/+$/, '');
  }
  return `${R2_PUBLIC_URL}/${account.username}`;
};

// Generate a presigned PUT URL for direct browser-to-R2 upload
app.get('/api/accounts/:id/upload-url', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const filename = req.query.filename || 'video.mp4';
    const ext = filename.split('.').pop().toLowerCase() || 'mp4';
    const videoNumber = (account.videoCount || 0) + 1;
    const folderPrefix = getFolderPrefix(account);
    const key = `${folderPrefix}/${videoNumber}.${ext}`;
    const publicUrl = `${getPublicBaseUrl(account)}/${videoNumber}.${ext}`;

    const contentTypeMap = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      avi: 'video/x-msvideo',
    };
    const contentType = contentTypeMap[ext] || 'video/mp4';

    const uploadUrl = await getPresignedUploadUrl(key, contentType);


    res.json({ uploadUrl, publicUrl, videoNumber, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Link an existing R2 directory (from another account) to this account
app.post('/api/accounts/:id/link-r2', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let { r2Prefix, videoCount, videoIndex } = req.body;
    if (!r2Prefix || !r2Prefix.startsWith('https://')) {
      return res.status(400).json({ error: 'Full Cloudflare URL (starting with https://) is required' });
    }

    account.r2Prefix = r2Prefix;
    
    // Auto-detect video count if not provided
    let detectionWarning = null;
    if (typeof videoCount !== 'number') {
      const folderPrefix = getFolderPrefix(account);
      try {
        const detection = await countR2Videos(folderPrefix);
        videoCount = detection.count;
        if (videoCount > 0 && !detection.hasFirst) {
          detectionWarning = `Detected ${videoCount} videos, but "1.mp4" was not found. Ensure filenames are 1.mp4, 2.mp4, etc.`;
        }
      } catch (detErr) {
        console.warn('R2 auto-detection failed:', detErr);
      }
    }

    if (typeof videoCount === 'number') {
      account.videoCount = videoCount;
    }
    if (typeof videoIndex === 'number') {
      account.videoIndex = videoIndex;
    }
    
    await account.save();

    res.json({ 
      message: `Linked R2 directory to account @${account.username}`,
      r2Prefix: account.r2Prefix,
      videoCount: account.videoCount,
      videoIndex: account.videoIndex,
      warning: detectionWarning
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm a successful upload — increment videoCount
app.post('/api/accounts/:id/confirm-upload', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const { videoNumber } = req.body;
    if (!videoNumber) return res.status(400).json({ error: 'videoNumber is required' });

    account.videoCount = Math.max(account.videoCount || 0, videoNumber);
    await account.save();

    res.json({ videoCount: account.videoCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate presigned URL for caption (.txt) upload — does NOT increment videoCount
app.get('/api/accounts/:id/caption-upload-url', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const videoNumber = req.query.videoNumber;
    if (!videoNumber) return res.status(400).json({ error: 'videoNumber query param is required' });

    const folderPrefix = getFolderPrefix(account);
    const key = `${folderPrefix}/${videoNumber}.txt`;
    const uploadUrl = await getPresignedUploadUrl(key, 'text/plain');

    res.json({ uploadUrl, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get next video URL WITHOUT advancing the pointer (peek only)
app.get('/api/accounts/:id/next-video', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const currentIndex = account.videoIndex || 1;
    const videoCount = account.videoCount || 0;

    if (videoCount === 0) {
      return res.status(400).json({ error: 'No videos uploaded yet for this account' });
    }
    if (currentIndex > videoCount) {
      return res.status(400).json({ error: `All ${videoCount} videos have been posted. Upload more!` });
    }

    const videoUrl = `${getPublicBaseUrl(account)}/${currentIndex}.mp4`;

    res.json({
      videoUrl,
      currentVideoNumber: currentIndex,
      totalVideos: videoCount,
      remaining: videoCount - currentIndex + 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark current video as done — advance the pointer
app.post('/api/accounts/:id/next-video/mark-done', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required in body (YYYY-MM-DD)' });

    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const currentIndex = account.videoIndex || 1;
    const videoCount = account.videoCount || 0;

    if (currentIndex > videoCount) {
      return res.status(400).json({ error: 'No pending video to mark as done' });
    }

    // 1. Advance the pointer on the account
    account.videoIndex = currentIndex + 1;
    await account.save();

    // 2. Automatically create a VideoPost record for today
    // Find next available slot for this date (1, 2, or 3)
    const existingPosts = await VideoPost.find({ accountId: account._id, date });
    const usedIndices = existingPosts.map(p => p.index);
    let nextSlotIndex = 1;
    while (usedIndices.includes(nextSlotIndex) && nextSlotIndex <= 3) {
      nextSlotIndex++;
    }

    let post = null;
    if (nextSlotIndex <= 3) {
      const videoUrl = `${getPublicBaseUrl(account)}/${currentIndex}.mp4`;
      post = await VideoPost.findOneAndUpdate(
        { accountId: account._id, date, index: nextSlotIndex },
        { 
          accountId: account._id, 
          date, 
          index: nextSlotIndex, 
          link: videoUrl, // Use R2 URL as placeholder
          uid: 'default_user',
          submittedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      markedVideoNumber: currentIndex,
      nextVideoNumber: currentIndex + 1,
      totalVideos: videoCount,
      remaining: videoCount - currentIndex,
      post: post // Return the created post if any
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy video from R2 — avoids CORS issues for blob download on mobile
app.get('/api/accounts/:id/video/:number', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const videoNumber = parseInt(req.params.number, 10);
    const folderPrefix = getFolderPrefix(account);
    const key = `${folderPrefix}/${videoNumber}.mp4`;

    const { stream, contentType, contentLength } = await getR2Object(key);

    res.set({
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Content-Disposition': `inline; filename="video_${videoNumber}.mp4"`,
      'Cache-Control': 'public, max-age=86400',
    });

    stream.pipe(res);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get caption text for a specific video number
app.get('/api/accounts/:id/caption/:number', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const videoNumber = parseInt(req.params.number, 10);
    const folderPrefix = getFolderPrefix(account);
    const key = `${folderPrefix}/${videoNumber}.txt`;

    try {
      const { stream } = await getR2Object(key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf-8');
      res.json({ caption: text, videoNumber });
    } catch (r2Err) {
      if (r2Err.name === 'NoSuchKey' || r2Err.$metadata?.httpStatusCode === 404) {
        return res.json({ caption: null, videoNumber });
      }
      throw r2Err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Video Posts ---
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await VideoPost.find({ uid: 'default_user' });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { accountId, date, index, link, viewsCount = 0 } = req.body;
    const post = await VideoPost.findOneAndUpdate(
      { accountId, date, index },
      { accountId, date, index, link, viewsCount, uid: 'default_user' },
      { upsert: true, new: true }
    );
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/posts/:accountId/:date/:index', async (req, res) => {
  try {
    const { accountId, date, index } = req.params;
    await VideoPost.findOneAndDelete({ accountId, date, index });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Handler Lookup ---
app.get('/api/accounts/lookup/:platform/:username', async (req, res) => {
  try {
    const account = await Account.findOne({
      platform: req.params.platform,
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') }
    });
    if (!account) return res.status(404).json({ error: 'Account not found for this platform' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts/handler/:handleId', async (req, res) => {
  try {
    const handler = await Handler.findOne({ handleId: req.params.handleId, uid: 'default_user' });
    if (!handler) {
      return res.status(404).json({ error: 'Handler not found. Invalid link.' });
    }
    const accounts = await Account.find({ handlerId: handler._id, uid: 'default_user' });
    res.json({ 
      handler: { 
        id: handler._id,
        name: handler.name, 
        isAdmin: handler.isAdmin || false 
      }, 
      accounts 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:accountId/:date', async (req, res) => {
  try {
    const posts = await VideoPost.find({
      accountId: req.params.accountId,
      date: req.params.date,
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Scraper sync ---
// POST /api/scrape/sync
// Called by run_all.py after each scrape run.
// Body: { platform, username, posts: [{postId, date, link, title, views, likes, comments, isPinned}] }
// Upserts one VideoPost per scraped video and updates Account aggregate stats.
app.post('/api/scrape/sync', async (req, res) => {
  try {
    const { platform, username, posts = [] } = req.body;
    if (!platform || !username) {
      return res.status(400).json({ error: 'platform and username are required' });
    }

    const account = await Account.findOne({
      platform,
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });
    if (!account) {
      return res.status(404).json({ error: `Account @${username} not found on ${platform}` });
    }

    const synced = [];
    for (const p of posts) {
      if (!p.postId) continue;

      // Reuse existing index if this post was synced before; otherwise assign next slot in 100+ range
      const existing = await VideoPost.findOne({ accountId: account._id, postId: p.postId });
      let idx = existing?.index;
      if (idx == null) {
        const maxPost = await VideoPost.findOne({
          accountId: account._id,
          date: p.date,
          index: { $gte: 100 },
        }).sort({ index: -1 });
        idx = (maxPost?.index ?? 99) + 1;
      }

      const doc = await VideoPost.findOneAndUpdate(
        { accountId: account._id, postId: p.postId },
        {
          $set: {
            accountId:  account._id,
            date:       p.date        || '',
            index:      idx,
            link:       p.link        || '',
            title:      (p.title      || '').slice(0, 200),
            viewsCount: p.views       || 0,
            likes:      p.likes       || 0,
            comments:   p.comments    || 0,
            isPinned:   p.isPinned    || false,
            postId:     p.postId,
            scrapedAt:  new Date(),
            uid:        'default_user',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced.push(doc);
    }

    // Sum up 7-day aggregates from all posts passed in this sync call
    const viewsLast7Days    = posts.reduce((s, p) => s + (p.views    || 0), 0);
    const likesLast7Days    = posts.reduce((s, p) => s + (p.likes    || 0), 0);
    const commentsLast7Days = posts.reduce((s, p) => s + (p.comments || 0), 0);

    await Account.findByIdAndUpdate(account._id, {
      viewsLast7Days,
      likesLast7Days,
      commentsLast7Days,
      lastScrapedAt: new Date(),
    });

    res.json({ synced: synced.length, accountId: account._id, viewsLast7Days, likesLast7Days, commentsLast7Days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

