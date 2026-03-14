import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  id: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  jobRole: string;
  description: string;
  email: string;
  company?: string;
  crNumber?: string;
  isUrgent: boolean;
  urgentUntil?: number;
  views: number;
  postedAt: number;
  isVerified?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const JobSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  city: { type: String, required: true },
  jobRole: { type: String, required: true },
  description: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String },
  crNumber: { type: String },
  isUrgent: { type: Boolean, default: false },
  urgentUntil: { type: Number },
  views: { type: Number, default: 0 },
  postedAt: { type: Number, required: true },
  isVerified: { type: Boolean, default: false },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, {
  collection: 'jobs',
  timestamps: false // We use postedAt manually
});

export default mongoose.model<IJob>('Job', JobSchema);
