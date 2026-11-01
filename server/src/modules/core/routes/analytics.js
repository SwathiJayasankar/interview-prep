import { Router } from 'express';
import { buildAnalytics } from '../services/analytics.js';

const router = Router();

router.get('/', async (req, res) => {
  const today = /^\d{4}-\d{2}-\d{2}$/.test(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10);
  res.json(await buildAnalytics(req.user, today));
});

export default router;
