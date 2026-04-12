import mongoose from 'mongoose';

const videoPostSchema = new mongoose.Schema({
  accountId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date:        { type: String, required: true },   // YYYY-MM-DD
  index:       { type: Number, required: true },   // 1–3 for manual daily slots; 100+ for scraped posts
  link:        { type: String, default: '' },      // public URL of the video / reel / short
  title:       { type: String, default: '' },      // reel caption or video title (first 200 chars)
  viewsCount:  { type: Number, default: 0 },
  likes:       { type: Number, default: 0 },
  comments:    { type: Number, default: 0 },
  isPinned:    { type: Boolean, default: false },
  // Platform-native post ID: shortcode (IG), video_id (YT), numeric id (FB)
  // Used as the upsert key by the scraper so repeated runs update rather than duplicate.
  postId:      { type: String, default: '' },
  scrapedAt:   { type: Date },                     // last time the scraper touched this record
  submittedAt: { type: Date, default: Date.now },
  uid:         { type: String, required: true },
});

// Existing compound index — manual daily-slot posts (1, 2, 3 per date)
videoPostSchema.index({ accountId: 1, date: 1, index: 1 }, { unique: true });

// Sparse unique index for scraper upserts — old manual records (no postId) are excluded
videoPostSchema.index({ accountId: 1, postId: 1 }, { unique: true, sparse: true });

export const VideoPost = mongoose.model('VideoPost', videoPostSchema);
