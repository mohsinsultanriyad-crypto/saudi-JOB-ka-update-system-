import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined in environment variables');
      return;
    }

    await mongoose.connect(uri, {
      dbName: 'saudijob'
    });
    console.log('MongoDB connected successfully to saudijob database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
