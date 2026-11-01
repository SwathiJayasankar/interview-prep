import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import { clamp } from '../utils/normalize.js';

const router = Router();

// Saves onboarding answers: target role, job description, goal, reminder time.
router.put('/', async (req, res) => {
  const { targetRole, jobDescription, goalText, goalWeeks, dailyMinutes, reminderTime } = req.body;
  const user = req.user;

  if (targetRole !== undefined) user.targetRole = String(targetRole).trim();
  if (jobDescription !== undefined) {
    if (String(jobDescription).trim().length < 50) throw new HttpError(400, 'Paste the full job description (at least a few lines).');
    user.jobDescription = String(jobDescription).trim();
  }
  if (goalText !== undefined) user.goal.text = String(goalText).trim();
  if (goalWeeks !== undefined) user.goal.weeks = clamp(Math.round(Number(goalWeeks)) || 6, 1, 8);
  if (dailyMinutes !== undefined) user.goal.dailyMinutes = clamp(Math.round(Number(dailyMinutes)) || 90, 15, 240);
  if (reminderTime !== undefined && /^\d{2}:\d{2}$/.test(reminderTime)) user.reminderTime = reminderTime;

  user.onboardingDone = Boolean(user.targetRole && user.jobDescription);
  await user.save();
  res.json({ user: user.toSafeJSON() });
});

export default router;
