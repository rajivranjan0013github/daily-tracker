import mongoose from 'mongoose';

const handlerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  handleId: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Handler = mongoose.model('Handler', handlerSchema);
