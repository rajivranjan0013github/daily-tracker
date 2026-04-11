import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: { type: String },
  ownerName: { type: String, required: true },
  platform: { type: String, enum: ['instagram', 'facebook', 'youtube', 'tiktok'], default: 'instagram' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handler' },
  assetsLink: { type: String },
  videoQueue: { type: [String], default: [] },
  videoIndex: { type: Number, default: 1 },
  videoCount: { type: Number, default: 0 },
  r2Prefix: { type: String, default: '' }, // Override R2 directory (uses username if empty)
  description: { type: String, default: '' },
  uid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Account = mongoose.model('Account', accountSchema);
