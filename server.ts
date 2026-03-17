import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './services/db';
import JobModel from './models/Job';
import admin from 'firebase-admin';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Firebase Admin Initialize
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase init error:', err);
  }
}

// ✅ Subscription Model
const subscriptionSchema = new mongoose.Schema({
  fcmToken: { type: String, required: true, unique: true },
  roles: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

// Connect to MongoDB (non-blocking)
connectDB().catch(err => {
  console.error('Initial MongoDB connection failed:', err.message);
  console.log('Server will continue to run, but API routes requiring DB will return 503.');
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const startServer = async () => {

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      dbState: mongoose.connection.readyState
    });
  });

  // ✅ Subscribe route - Save FCM token + roles
  app.post('/api/subscribe', async (req, res) => {
    try {
      const { fcmToken, roles } = req.body;
      if (!fcmToken) return res.status(400).json({ error: 'fcmToken is required' });
      
      await Subscription.findOneAndUpdate(
        { fcmToken },
        { fcmToken, roles: roles || [] },
        { upsert: true, new: true }
      );
      const total = await Subscription.countDocuments();
      console.log(`✅ Subscription saved. Token: ${fcmToken.substring(0, 20)}... Roles: ${roles} | Total: ${total}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Subscribe error:', error);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  // ✅ Unsubscribe route
  app.delete('/api/subscribe', async (req, res) => {
    try {
      const { fcmToken } = req.body;
      await Subscription.deleteOne({ fcmToken });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

  app.get(['/api/jobs', '/api/jobs/'], async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
          error: 'Database is currently unavailable.',
          details: 'The server is unable to connect to the database.'
        });
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

  app.post(['/api/jobs', '/api/jobs/'], async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
          error: 'Database is currently unavailable.',
          details: 'The server is unable to connect to the database.'
        });
      }
      const jobData = req.body;
      const id = Math.random().toString(36).substring(2, 11);
      const postedAt = Date.now();
      const newJobData = { ...jobData, id, postedAt, createdAt: new Date(), views: 0 };
      if (newJobData.isUrgent) newJobData.urgentUntil = Date.now() + (24 * 60 * 60 * 1000);
      const newJob = new JobModel(newJobData);
      await newJob.save();
      res.status(201).json(newJob);

      // ✅ Send notifications after job saved
      console.log('✅ Job saved - sending notifications...');
      try {
        const allSubscriptions = await Subscription.find({});
        console.log(`📋 Total subscriptions: ${allSubscriptions.length}`);

        const matching = allSubscriptions.filter((sub: any) => {
          // ✅ FIX: Agar user ne koi role select nahi kiya to use bhi notify karo
          if (!sub.roles || sub.roles.length === 0) return true;

          // Agar role select kiya hai to match check karo
          return sub.roles.some((role: string) =>
            newJob.title.toLowerCase().includes(role.toLowerCase()) ||
            role.toLowerCase().includes(newJob.title.toLowerCase().split(' ')[0])
          );
        });

        console.log(`🎯 Matching subscriptions: ${matching.length}`);

        for (const sub of matching) {
          try {
            await admin.messaging().send({
              notification: {
                title: '🔔 New Job Alert!',
                body: `${newJob.title} - ${(newJob as any).location || 'Saudi Arabia'}`
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'job_alerts'
                }
              },
              token: sub.fcmToken
            });
            console.log(`✅ Notification sent to: ${sub.fcmToken.substring(0, 20)}...`);
          } catch (err: any) {
            console.error(`❌ Failed: ${err.message}`);
          }
        }
        console.log('🎉 All notifications processed!');
      } catch (err) {
        console.error('❌ Notification error:', err);
      }

    } catch (error) {
      console.error('Error posting job:', error);
      res.status(500).json({ error: 'Failed to post job' });
    }
  });

  app.put('/api/jobs/:id', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database unavailable' });
      const { id } = req.params;
      const { email, adminKey, ...updateData } = req.body;
      const job = await JobModel.findOne({ id });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      const isAdmin = adminKey === 'saudi_admin_2025';
      if (!isAdmin && job.email !== email) return res.status(403).json({ error: 'Unauthorized' });
      const updatedJob = await JobModel.findOneAndUpdate({ id }, { $set: updateData }, { new: true });
      res.json(updatedJob);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update' });
    }
  });

  app.delete('/api/jobs/:id', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database unavailable' });
      const { id } = req.params;
      const { email, adminKey } = req.body;
      const job = await JobModel.findOne({ id });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      const isAdmin = adminKey === 'saudi_admin_2025';
      if (!isAdmin) {
        if (job.email !== email) return res.status(403).json({ error: 'Unauthorized' });
      }
      await JobModel.deleteOne({ id });
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  app.post('/api/jobs/:id/view', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database unavailable' });
      await JobModel.findOneAndUpdate({ id: req.params.id }, { $inc: { views: 1 } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    try {
      const vite = await createViteServer({ 
        server: { middlewareMode: true }, 
        appType: 'spa',
        logLevel: 'info',
        root: process.cwd()
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized.');
    } catch (e) {
      console.error('Vite initialization failed:', e);
    }
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    next(err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
