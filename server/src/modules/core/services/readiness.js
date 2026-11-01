// Interview readiness score (0-100). A weighted blend of four signals.
// If a signal does not exist yet (e.g. no plan), it is skipped and the rest are re-weighted.

const WEIGHTS = { interviews: 0.5, resume: 0.25, plan: 0.15, consistency: 0.1 };

export function computeReadiness({ sessions, resumeAnalysis, taskStats }) {
  // sessions: completed, oldest first. Last 5 count, newer ones weigh more.
  const recent = sessions.slice(-5);
  let interviews = null;
  if (recent.length) {
    const weights = recent.map((_, i) => i + 1);
    const weighted = recent.reduce((sum, s, i) => sum + s.summary.overall * weights[i], 0);
    interviews = (weighted / weights.reduce((a, b) => a + b, 0)) * 10;
  }

  const resume = resumeAnalysis ? 0.5 * resumeAnalysis.atsScore + 0.5 * resumeAnalysis.coverage * 100 : null;
  const plan = taskStats.dueCount ? (taskStats.doneCount / taskStats.dueCount) * 100 : null;

  // 4 interviews in the last 14 days = full marks
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentCount = sessions.filter((s) => new Date(s.completedAt).getTime() >= twoWeeksAgo).length;
  const consistency = sessions.length ? Math.min(1, recentCount / 4) * 100 : null;

  const components = [
    { key: 'interviews', label: 'Mock interview scores', score: interviews },
    { key: 'resume', label: 'Resume fit', score: resume },
    { key: 'plan', label: 'Study plan progress', score: plan },
    { key: 'consistency', label: 'Practice consistency', score: consistency },
  ].map((c) => ({ ...c, weight: WEIGHTS[c.key], score: c.score === null ? null : Math.round(c.score) }));

  const used = components.filter((c) => c.score !== null);
  const totalWeight = used.reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight ? Math.round(used.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight) : 0;

  const label = score < 40 ? 'Getting started' : score < 60 ? 'Building up' : score < 80 ? 'Almost ready' : 'Interview ready';
  return { score, label, components };
}
