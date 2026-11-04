import { Router } from 'express';
import mongoose from 'mongoose';
import { Plan, Task } from '../models/Plan.js';
import Resume from '../../resume/models/Resume.js';
import { buildPlan } from '../services/planner.js';
import { getTopicStats } from '../../core/services/analytics.js';
import { HttpError } from '../../core/middleware/errorHandler.js';

const router = Router();

router.get('/', async (req, res) => {
  const plan = await Plan.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const tasks = plan ? await Task.find({ plan: plan._id }).sort({ dueDay: 1, day: 1 }) : [];
  res.json({ plan, tasks });
});

// Builds a new plan from resume gaps + weak interview topics. Replaces the old plan.
// The browser sends its own local date as "today" so due dates match the student's calendar.
router.post('/generate', async (req, res) => {
  const user = req.user;
  if (!user.targetRole || !user.jobDescription) throw new HttpError(400, 'Add your target role and job description first.');

  const startDay = /^\d{4}-\d{2}-\d{2}$/.test(req.body.today) ? req.body.today : new Date().toISOString().slice(0, 10);

  const resume = await Resume.findOne({ user: user._id, analysis: { $ne: null } }).sort({ createdAt: -1 });
  const missingSkills = [...(resume?.analysis?.missingRequired || []), ...(resume?.analysis?.missingPreferred || [])].slice(0, 10);
  const weakTopics = (await getTopicStats(user._id)).filter((t) => t.avg < 6.5).slice(0, 6).map((t) => t.topic);

  const built = await buildPlan({ user, missingSkills, weakTopics, weeks: user.goal.weeks, startDay });

  // Only delete the old plan once the new one has been generated successfully
  const oldPlans = await Plan.find({ user: user._id }).select('_id');
  await Task.deleteMany({ plan: { $in: oldPlans.map((p) => p._id) } });
  await Plan.deleteMany({ user: user._id });

  const plan = await Plan.create({ user: user._id, startDay, weeks: built.weeks, basedOn: { missingSkills, weakTopics } });
  await Task.insertMany(built.tasks.map((t) => ({ ...t, user: user._id, plan: plan._id })));

  const tasks = await Task.find({ plan: plan._id }).sort({ dueDay: 1, day: 1 });
  res.status(201).json({ plan, tasks });
});

router.patch('/tasks/:id', async (req, res) => {
  const task = mongoose.isValidObjectId(req.params.id) && (await Task.findOne({ _id: req.params.id, user: req.user._id }));
  if (!task) throw new HttpError(404, 'Task not found.');
  task.done = Boolean(req.body.done);
  task.doneAt = task.done ? new Date() : null;
  await task.save();
  res.json({ task });
});

export default router;
