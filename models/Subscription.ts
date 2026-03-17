import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  fcmToken: { type: String, required: true, unique: true },
  roles: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
