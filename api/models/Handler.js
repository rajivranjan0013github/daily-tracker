import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { _id: false });

const handlerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  handleId: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
  // Posting reminder times in "HH:MM" 24h format (IST), e.g. ["09:00", "18:00"]
  notificationTimes: { type: [String], default: [] },
  notificationsEnabled: { type: Boolean, default: false },
});

export const Handler = mongoose.model('Handler', handlerSchema);
