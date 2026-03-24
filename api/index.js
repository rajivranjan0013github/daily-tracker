import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Project } from './models/Project.js';
import { Handler } from './models/Handler.js';
import { Account } from './models/Account.js';
import { VideoPost } from './models/VideoPost.js';

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

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.status(204).send();
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
    res.json({ handler: { name: handler.name }, accounts });
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

