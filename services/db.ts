import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined in environment variables');
      return;
    }

    await mongoose.connect(uri, {
      dbName: 'saudijob',
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 10000,
    });
    const host = mongoose.connection.host;
    console.log(`MongoDB connected successfully to host: ${host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit process, allow server to start so user can see error messages or fix config
  }
};
