import { askJson } from '../../core/services/groq.js';
import { scoreResume } from './atsScore.js';
import { str, strList, list } from '../../core/utils/normalize.js';

// Compares the resume with the job description.
async function findSkillGap({ parsed, targetRole, jobDescription }) {
  const out = await askJson({
    maxTokens: 3000,
    temperature: 0.2,
    system: `You are a technical recruiter and career coach for students applying to software roles.
Compare the resume with the job description and return JSON:
{
  "requiredSkills":  [{"skill": string, "found": boolean, "evidence": string}],
  "preferredSkills": [{"skill": string, "found": boolean, "evidence": string}],
  "otherGaps": [{"area": string, "detail": string}],
  "recommendations": [{"skill": string, "priority": "high"|"medium"|"low", "why": string, "learningPath": [string], "estimatedWeeks": number}],
  "summary": string
}
Rules:
- requiredSkills: at most 12 skills the job description clearly requires. preferredSkills: at most 8 "nice to have" skills.
- found = true only if the resume shows the skill (skills list, project or experience). evidence = where you saw it, or "" if not found.
- otherGaps: things that are not single skills, such as no deployment experience, no internships, no tests, no GitHub link, no quantified results, weak project depth.
- recommendations: one per missing required skill first, then important missing preferred skills and otherGaps. learningPath = 3 to 5 ordered, concrete steps (e.g. "Learn Docker basics", "Containerize your own project", "Push the image to Docker Hub").
- summary: 2 sentences on how well the candidate fits the role.`,
    user: `TARGET ROLE: ${targetRole}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3500)}\n\nRESUME (structured):\n${JSON.stringify(parsed).slice(0, 5000)}`,
  });

  const skills = (items) =>
    list(items, 14)
      .map((s) => ({ skill: str(s?.skill), found: s?.found === true, evidence: str(s?.evidence) }))
      .filter((s) => s.skill);

  return {
    requiredSkills: skills(out.requiredSkills),
    preferredSkills: skills(out.preferredSkills),
    otherGaps: list(out.otherGaps, 8).map((g) => ({ area: str(g?.area), detail: str(g?.detail) })).filter((g) => g.area),
    recommendations: list(out.recommendations, 12)
      .map((r) => ({
        skill: str(r?.skill),
        priority: ['high', 'medium', 'low'].includes(r?.priority) ? r.priority : 'medium',
        why: str(r?.why),
        learningPath: strList(r?.learningPath, 6),
        estimatedWeeks: Math.max(1, Math.round(Number(r?.estimatedWeeks) || 1)),
      }))
      .filter((r) => r.skill),
    summary: str(out.summary),
  };
}

// Rewrites the weakest bullet points.
async function rewriteBullets(parsed) {
  const bullets = [
    ...parsed.experience.flatMap((e) => e.bullets),
    ...parsed.projects.flatMap((p) => p.bullets),
  ];
  if (!bullets.length) return [];

  const out = await askJson({
    maxTokens: 1500,
    temperature: 0.4,
    system: `You improve resume bullet points for software students.
Pick the 5 weakest bullets from the list (vague, passive, or without results) and rewrite each one.
Rules: start with a strong action verb, say what was built and how, and show impact.
NEVER invent numbers or facts. If a metric is needed but unknown, use a placeholder like [X%] or [N users] for the student to fill in.
Return JSON: {"rewrites": [{"original": string, "improved": string, "why": string}]}`,
    user: bullets.slice(0, 30).map((b, i) => `${i + 1}. ${b}`).join('\n'),
  });

  return list(out.rewrites, 5)
    .map((r) => ({ original: str(r?.original), improved: str(r?.improved), why: str(r?.why) }))
    .filter((r) => r.original && r.improved);
}

export async function analyzeResume({ resume, user }) {
  const [gap, bulletRewrites] = await Promise.all([
    findSkillGap({ parsed: resume.parsed, targetRole: user.targetRole, jobDescription: user.jobDescription }),
    rewriteBullets(resume.parsed),
  ]);

  const matchedRequired = gap.requiredSkills.filter((s) => s.found);
  const coverage = gap.requiredSkills.length ? matchedRequired.length / gap.requiredSkills.length : 0;
  const ats = scoreResume(resume.rawText, coverage);

  return {
    atsScore: ats.score,
    atsBreakdown: ats.checks,
    formattingIssues: ats.issues,
    coverage,
    requiredSkills: gap.requiredSkills,
    preferredSkills: gap.preferredSkills,
    missingRequired: gap.requiredSkills.filter((s) => !s.found).map((s) => s.skill),
    missingPreferred: gap.preferredSkills.filter((s) => !s.found).map((s) => s.skill),
    otherGaps: gap.otherGaps,
    recommendations: gap.recommendations,
    bulletRewrites,
    summary: gap.summary,
  };
}
