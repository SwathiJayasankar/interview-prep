import InterviewSession from '../../interview/models/InterviewSession.js';
import Resume from '../../resume/models/Resume.js';
import { Task } from '../../plan/models/Plan.js';
import { computeReadiness } from './readiness.js';
import { average, round1 } from '../utils/normalize.js';

// Average score per topic across every answered question, weakest first.
export async function getTopicStats(userId) {
  const sessions = await InterviewSession.find({ user: userId, status: 'completed' });
  const topics = {};
  for (const s of sessions) {
    for (const t of s.turns) {
      if (t.evaluation) (topics[t.topic.toLowerCase()] ||= []).push(t.overall);
    }
  }
  return Object.entries(topics)
    .map(([topic, scores]) => ({ topic, avg: round1(average(scores)), count: scores.length }))
    .sort((a, b) => a.avg - b.avg);
}

export async function buildAnalytics(user, today) {
  const sessions = await InterviewSession.find({ user: user._id, status: 'completed' }).sort({ completedAt: 1 });
  const resume = await Resume.findOne({ user: user._id, analysis: { $ne: null } }).sort({ createdAt: -1 });
  const dueTasks = await Task.find({ user: user._id, dueDay: { $lte: today } });

  const rubricKeys = ['correctness', 'clarity', 'structure', 'depth', 'confidence'];
  const rubric = {};
  for (const key of rubricKeys) rubric[key] = round1(average(sessions.map((s) => s.summary.rubric?.[key] ?? 0)));

  const topics = await getTopicStats(user._id);

  return {
    readiness: computeReadiness({
      sessions,
      resumeAnalysis: resume?.analysis,
      taskStats: { dueCount: dueTasks.length, doneCount: dueTasks.filter((t) => t.done).length },
    }),
    sessionsCompleted: sessions.length,
    trend: sessions.map((s) => ({ id: s._id, date: s.completedAt, overall: s.summary.overall, style: s.config.style })),
    rubric: sessions.length ? rubric : null,
    strongest: [...topics].reverse().slice(0, 3),
    weakest: topics.slice(0, 5),
    topics,
  };
}
