import { askJson } from '../../core/services/groq.js';
import { buildResource } from './resources.js';
import { addDays, clamp, str, strList, list } from '../../core/utils/normalize.js';

// Creates a weekly roadmap with one task per weekday.
// The AI picks WHAT to study; code decides dates and builds links.
export async function buildPlan({ user, missingSkills, weakTopics, weeks, startDay }) {
  const out = await askJson({
    maxTokens: 7000,
    temperature: 0.4,
    system: `You are a placement coach creating a ${weeks}-week study roadmap for a student applying for "${user.targetRole}".
The student can study about ${user.goal.dailyMinutes} minutes per day. Their goal: ${user.goal.text || 'get a job offer'}.
Order the weeks sensibly: fix the biggest skill gaps first, mix in practice, and keep the last week for revision and mock interviews.
Return JSON:
{"weeks": [{"week": 1, "focus": string, "goals": [string],
  "tasks": [{"title": string, "description": string, "topic": string, "estMinutes": number,
             "resources": [{"title": string, "kind": "video"|"article"|"practice"|"docs", "query": string}]}]}]}
Rules: exactly ${weeks} weeks. Exactly 5 tasks per week (one per weekday, Monday to Friday). 2-3 goals per week.
Each task is specific and doable in one sitting (e.g. "Build a REST API with JWT auth", not "Learn backend").
Each task has 1-2 resources. "query" is a short search phrase a student can type into YouTube/Google. Do NOT write URLs.`,
    user: `JOB DESCRIPTION:\n${user.jobDescription.slice(0, 2500)}\n\nMISSING SKILLS (from resume analysis): ${missingSkills.join(', ') || 'none found yet'}\nWEAK INTERVIEW TOPICS (lowest scores first): ${weakTopics.join(', ') || 'no interviews taken yet'}`,
  });

  const planWeeks = [];
  const tasks = [];

  list(out.weeks, weeks).forEach((w, i) => {
    const week = i + 1;
    const focus = str(w?.focus, `Week ${week}`);
    planWeeks.push({ week, focus, goals: strList(w?.goals, 4) });

    // Weekdays: the AI's tasks
    list(w?.tasks, 5).forEach((t, d) => {
      tasks.push({
        week, day: d + 1, dueDay: addDays(startDay, i * 7 + d), cadence: 'daily',
        title: str(t?.title, 'Study session'),
        description: str(t?.description),
        topic: str(t?.topic),
        estMinutes: clamp(Math.round(Number(t?.estMinutes) || user.goal.dailyMinutes), 15, 240),
        resources: list(t?.resources, 3).map((r) => buildResource({ title: str(r?.title, 'Resource'), kind: r?.kind, query: str(r?.query) })),
      });
    });

    // Day 7: the same weekly review for everyone, so it is added by code
    tasks.push({
      week, day: 7, dueDay: addDays(startDay, i * 7 + 6), cadence: 'weekly',
      title: `Weekly mock interview and review: ${focus}`,
      description: 'Take a 5-question mock interview, read every piece of feedback, and write down the three topics you want to improve next week.',
      topic: focus, estMinutes: 60, resources: [],
    });
  });

  if (!planWeeks.length) throw new Error('The AI could not build a plan. Please try again.');
  return { weeks: planWeeks, tasks };
}
