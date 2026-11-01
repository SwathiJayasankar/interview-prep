import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { connectDb } from './modules/core/config/db.js';
import { requireAuth } from './modules/core/middleware/auth.js';
import { errorHandler, notFound } from './modules/core/middleware/errorHandler.js';
import authRoutes from './modules/core/routes/auth.js';
import profileRoutes from './modules/core/routes/profile.js';
import resumeRoutes from './modules/resume/routes/resume.js';
import interviewRoutes from './modules/interview/routes/interview.js';
import planRoutes from './modules/plan/routes/plan.js';
import analyticsRoutes from './modules/core/routes/analytics.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/resume', requireAuth, resumeRoutes);
app.use('/api/interview', requireAuth, interviewRoutes);
app.use('/api/plan', requireAuth, planRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);

// In production, serve the built React app from the same server.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(clientDist, 'index.html')) : next()));
}

app.use(notFound);
app.use(errorHandler);

await connectDb();
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
