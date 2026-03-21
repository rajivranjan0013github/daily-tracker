import mongoose from 'mongoose';

const videoPostSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  index: { type: Number, required: true }, // 1, 2, or 3 representing the checkbox
  link: { type: String, default: '' },
  viewsCount: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  uid: { type: String, required: true },
});

// Compound index for fast lookup of a specific post
videoPostSchema.index({ accountId: 1, date: 1, index: 1 }, { unique: true });

export const VideoPost = mongoose.model('VideoPost', videoPostSchema);
