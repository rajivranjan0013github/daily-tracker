import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  ownerName: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  uid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Account = mongoose.model('Account', accountSchema);
