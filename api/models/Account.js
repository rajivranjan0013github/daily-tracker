import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: { type: String },
  ownerName: { type: String, required: true },
  platform: { type: String, enum: ['instagram', 'facebook', 'youtube', 'tiktok'], default: 'instagram' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handler' },
  assetsLink: { type: String },
  description: { type: String, default: '' },
  uid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Account = mongoose.model('Account', accountSchema);
