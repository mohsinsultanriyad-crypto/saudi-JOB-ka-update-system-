import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './services/db';
import JobModel from './models/Job';
import admin from 'firebase-admin';

// Initialize Firebase Admin
let firestoreDb: admin.firestore.Firestore | null = null;

try {
  admin.initializeApp({
    projectId: "iamrealmohsin-70c83"
  });
  firestoreDb = admin.firestore();
} catch (error) {
  console.error('Firebase Admin init error:', error);
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDB();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory store for verification codes (Email -> {code, expires})
const verificationCodes: Record<string, { code: string, expires: number }> = {};

// Helper to send email (Mocking only)
const sendVerificationEmail = async (email: string, code: string) => {
  console.log(`[VERIFICATION CODE] Code ${code} for ${email}`);
};

// API Routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.post('/api/auth/request-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    await sendVerificationEmail(email, code);
    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Return empty array instead of error if DB not connected yet, to avoid frontend crash
      return res.json([]);
    }
    const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
    
    const activeJobs = await JobModel.find({
      postedAt: { $gt: fifteenDaysAgo }
    }).sort({ postedAt: -1 });
    
    res.json(activeJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected. Please check MONGODB_URI.' });
    }
    const jobData = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    const postedAt = Date.now();
    
    const newJobData = {
      ...jobData,
      id,
      postedAt,
      views: 0
    };

    if (newJobData.isUrgent) {
      newJobData.urgentUntil = Date.now() + (24 * 60 * 60 * 1000);
    }

    const newJob = new JobModel(newJobData);
    await newJob.save();

    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, adminKey, ...updateData } = req.body;
    
    const job = await JobModel.findOne({ id });
    
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const isAdmin = adminKey === 'saudi_admin_2025';
    
    if (!isAdmin && job.email !== email) {
      return res.status(403).json({ error: 'Unauthorized: Email mismatch' });
    }

    if (updateData.isUrgent && !job.isUrgent) {
      updateData.urgentUntil = Date.now() + (24 * 60 * 60 * 1000);
    }

    const updatedJob = await JobModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    );
    
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, adminKey, verificationCode } = req.body;
    
    const job = await JobModel.findOne({ id });
    
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const isAdmin = adminKey === 'saudi_admin_2025';
    
    if (!isAdmin) {
      if (job.email !== email) {
        return res.status(403).json({ error: 'Unauthorized: Email mismatch' });
      }

      // Check verification code
      const stored = verificationCodes[email];
      if (!stored || stored.code !== verificationCode || stored.expires < Date.now()) {
        return res.status(401).json({ error: 'Invalid or expired verification code' });
      }

      // Clear code after use
      delete verificationCodes[email];
    }

    await JobModel.deleteOne({ id });
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

app.post('/api/jobs/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    await JobModel.findOneAndUpdate({ id }, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing views:', error);
    res.status(500).json({ error: 'Failed to increment views' });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
