import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  uid: { type: String, required: true }, // For future auth integration
  createdAt: { type: Date, default: Date.now },
});

export const Project = mongoose.model('Project', projectSchema);
