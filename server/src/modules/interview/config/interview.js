// Everything that shapes an interview lives here, so it is easy to tweak.

export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const MODES = ['text', 'voice'];

// "behavioralShare" = roughly what fraction of questions are behavioral.
export const STYLES = {
  general: {
    label: 'General',
    guide: 'Balanced mix of fundamentals, problem solving and questions about the candidate\'s projects.',
    behavioralShare: 0.3,
  },
  'big-tech': {
    label: 'Product / big-tech',
    guide: 'Focus on data structures, algorithms, complexity analysis and basic system design. Ask the candidate to justify trade-offs and think step by step.',
    behavioralShare: 0.25,
  },
  'leadership-principles': {
    label: 'Amazon-style (leadership principles)',
    guide: 'Mostly behavioral questions testing ownership, customer focus, bias for action and diving deep. Expect STAR answers and probe for specific metrics.',
    behavioralShare: 0.7,
  },
  startup: {
    label: 'Startup',
    guide: 'Practical questions: building, debugging and shipping quickly, ownership, and choosing trade-offs under time pressure.',
    behavioralShare: 0.35,
  },
  services: {
    label: 'IT services / campus placement',
    guide: 'CS fundamentals (OOP, DBMS, OS, networks), basic coding logic, explaining projects, and HR questions such as strengths, weaknesses and teamwork.',
    behavioralShare: 0.4,
  },
};

// Raise difficulty after a strong answer, lower it after a weak one.
export function nextDifficulty(current, overall) {
  const i = DIFFICULTIES.indexOf(current);
  if (overall >= 7.5) return DIFFICULTIES[Math.min(i + 1, DIFFICULTIES.length - 1)];
  if (overall < 4.5) return DIFFICULTIES[Math.max(i - 1, 0)];
  return current;
}

// Spreads behavioral questions evenly through the interview.
export function pickKind(index, styleId) {
  const share = (STYLES[styleId] || STYLES.general).behavioralShare;
  return Math.floor((index + 1) * share) > Math.floor(index * share) ? 'behavioral' : 'technical';
}
