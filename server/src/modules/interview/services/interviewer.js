import { askJson, MODELS } from '../../core/services/groq.js';
import { STYLES, pickKind } from '../config/interview.js';
import { clamp, num, str, strList, round1, average } from '../../core/utils/normalize.js';

const RUBRIC = ['correctness', 'clarity', 'structure', 'depth', 'confidence'];
const WEIGHTS = { correctness: 0.3, clarity: 0.2, structure: 0.15, depth: 0.25, confidence: 0.1 };

export function overallScore(scores) {
  return round1(RUBRIC.reduce((sum, key) => sum + scores[key] * WEIGHTS[key], 0));
}

function resumeBrief(resume) {
  if (!resume?.parsed) return 'No resume provided.';
  const p = resume.parsed;
  const projects = p.projects.map((x) => `${x.name} (${x.techStack.join(', ')})`).join('; ');
  return `Skills: ${p.skills.slice(0, 25).join(', ')}\nProjects: ${projects}`;
}

// ---------------------------------------------------------------- questions

// `turns` = the questions already asked. The last one has been answered and evaluated.
export async function generateQuestion({ user, resume, config, difficulty, turns }) {
  const style = STYLES[config.style] || STYLES.general;
  const last = turns[turns.length - 1];
  const covered = [...new Set(turns.map((t) => t.topic))];

  // Adaptive logic is decided in code (predictable); the AI only writes the question.
  // Never ask two follow-ups in a row.
  const canFollowUp = last && !last.isFollowUp;
  let mode = 'new';
  if (canFollowUp && last.overall < 6.5) mode = 'probe';
  else if (canFollowUp && last.overall >= 8.5) mode = 'deeper';

  const kind = mode === 'new' ? pickKind(turns.length, config.style) : last.kind;

  let directive;
  if (mode === 'probe') {
    directive = `The candidate's last answer was weak. Ask ONE follow-up about "${last.topic}" that probes this gap: ${last.evaluation?.improvements?.[0] || 'the missing details'}.`;
  } else if (mode === 'deeper') {
    directive = `The candidate's last answer was strong. Ask ONE harder follow-up about "${last.topic}" (an edge case, scale, or trade-off).`;
  } else {
    directive = `Ask a NEW ${kind} question about a topic not yet covered. Already covered: ${covered.join(', ') || 'nothing'}. Choose the topic from the job description. About one in three questions should refer to the candidate's own projects.`;
  }

  const lastExchange = last
    ? `\nPREVIOUS QUESTION: ${last.question}\nCANDIDATE ANSWER: ${last.answer.slice(0, 1000)}\nSCORE: ${last.overall}/10`
    : '';

  const out = await askJson({
    model: MODELS.fast,
    maxTokens: 300,
    temperature: 0.7,
    system: `You are an interviewer hiring for the role "${user.targetRole}". Interview style: ${style.guide}
Difficulty: ${difficulty}. Ask exactly ONE question, under 60 words. Never reveal the answer or give hints.
Return JSON: {"question": string, "topic": string (2-3 words, e.g. "React hooks")}`,
    user: `JOB DESCRIPTION:\n${user.jobDescription.slice(0, 2500)}\n\nCANDIDATE:\n${resumeBrief(resume)}${lastExchange}\n\n${directive}`,
  });

  const question = str(out.question);
  if (!question) throw new Error('The AI did not return a question. Please try again.');
  return {
    question,
    kind,
    topic: mode === 'new' ? str(out.topic, 'general') || 'general' : last.topic,
    isFollowUp: mode !== 'new',
  };
}

// --------------------------------------------------------------- evaluation

export async function evaluateAnswer({ user, turn, speech }) {
  const delivery = speech?.wpm
    ? `\nDELIVERY (voice answer): ${speech.wpm} words/min (${speech.paceLabel}), ${speech.fillerCount} filler words, ${speech.pauseCount} long pauses.`
    : '';

  const out = await askJson({
    maxTokens: 1500,
    temperature: 0.2,
    system: `You are a strict but fair interview coach for a student applying for "${user.targetRole}".
Score the answer from 0 to 10 on each criterion. Be calibrated: 5 is an average student answer, 8+ is excellent and rare. An empty answer or "I don't know" scores 2 or less.
- correctness: is it factually and technically right?
- clarity: easy to follow, plain language?
- structure: logical order (for behavioral answers, the STAR order)?
- depth: specifics, examples, trade-offs, edge cases?
- confidence: decisive wording instead of hedging ("maybe", "I think", "sort of")${speech?.wpm ? '; also consider the delivery data' : ''}.
Return JSON:
{
  "scores": {"correctness": n, "clarity": n, "structure": n, "depth": n, "confidence": n},
  "strengths": [string], "improvements": [string],
  "star": {"situation": bool, "task": bool, "action": bool, "result": bool, "feedback": string},
  "idealAnswer": string
}
strengths: 1-3 items. improvements: 1-3 concrete, actionable items. idealAnswer: a model answer of 80-150 words${turn.kind === 'behavioral' ? ' that follows STAR and uses a realistic example' : ''}.
${turn.kind === 'behavioral' ? 'star: say whether the candidate\'s answer contained each STAR part.' : 'This is a technical question: set all star fields to false and star.feedback to "".'}`,
    user: `QUESTION (${turn.kind}, ${turn.difficulty}, topic: ${turn.topic}): ${turn.question}\n\nCANDIDATE ANSWER:\n${turn.answer}${delivery}`,
  });

  const scores = {};
  for (const key of RUBRIC) scores[key] = clamp(num(out.scores?.[key], 0), 0, 10);

  return {
    scores,
    strengths: strList(out.strengths, 3),
    improvements: strList(out.improvements, 3),
    star: {
      applicable: turn.kind === 'behavioral',
      situation: out.star?.situation === true,
      task: out.star?.task === true,
      action: out.star?.action === true,
      result: out.star?.result === true,
      feedback: str(out.star?.feedback),
    },
    idealAnswer: str(out.idealAnswer),
  };
}

// ------------------------------------------------------------------ summary

// Fills session.summary and marks the session completed.
export async function completeSession(session, user) {
  const answered = session.turns.filter((t) => t.evaluation);

  const rubric = {};
  for (const key of RUBRIC) rubric[key] = round1(average(answered.map((t) => t.evaluation.scores[key])));

  const topics = {};
  for (const t of answered) {
    const key = t.topic.toLowerCase();
    (topics[key] ||= []).push(t.overall);
  }
  const byTopic = Object.entries(topics).map(([topic, scores]) => ({ topic, avg: round1(average(scores)), count: scores.length }));

  const out = await askJson({
    model: MODELS.fast,
    maxTokens: 600,
    temperature: 0.3,
    system: `You are an interview coach writing a short end-of-interview report for a student applying for "${user.targetRole}".
Return JSON: {"text": string (3 sentences), "strengths": [string], "weaknesses": [string], "nextSteps": [string]} with 2-3 items per list.`,
    user: answered.map((t, i) => `${i + 1}. [${t.topic}, ${t.overall}/10] ${t.question}\nMain improvement: ${t.evaluation.improvements[0] || 'none'}`).join('\n'),
  });

  session.summary = {
    overall: round1(average(answered.map((t) => t.overall))),
    rubric,
    byTopic,
    text: str(out.text),
    strengths: strList(out.strengths, 4),
    weaknesses: strList(out.weaknesses, 4),
    nextSteps: strList(out.nextSteps, 4),
  };
  session.status = 'completed';
  session.completedAt = new Date();
}
