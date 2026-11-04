import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import InterviewSession from '../models/InterviewSession.js';
import Resume from '../../resume/models/Resume.js';
import { DIFFICULTIES, MODES, STYLES, nextDifficulty } from '../config/interview.js';
import { generateQuestion, evaluateAnswer, overallScore, completeSession } from '../services/interviewer.js';
import { transcribeAudio, analyzeSpeech } from '../services/speech.js';
import { HttpError } from '../../core/middleware/errorHandler.js';
import { clamp } from '../../core/utils/normalize.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function findOwnSession(req) {
  const { id } = req.params;
  const session = mongoose.isValidObjectId(id) && (await InterviewSession.findOne({ _id: id, user: req.user._id }));
  if (!session) throw new HttpError(404, 'Interview not found.');
  return session;
}

// Options for the setup screen
router.get('/options', (req, res) => {
  res.json({
    styles: Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, guide: s.guide })),
    difficulties: DIFFICULTIES,
  });
});

// Past interviews (no transcripts, just the headline numbers)
router.get('/', async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).select('-turns');
  res.json({ sessions });
});

router.get('/:id', async (req, res) => {
  res.json({ session: await findOwnSession(req) });
});

// Start: creates the session and asks the first question
router.post('/start', async (req, res) => {
  const user = req.user;
  if (!user.targetRole || !user.jobDescription) throw new HttpError(400, 'Add your target role and job description first.');

  const config = {
    mode: MODES.includes(req.body.mode) ? req.body.mode : 'text',
    difficulty: DIFFICULTIES.includes(req.body.difficulty) ? req.body.difficulty : 'medium',
    style: STYLES[req.body.style] ? req.body.style : 'general',
    numQuestions: clamp(Math.round(Number(req.body.numQuestions)) || 6, 3, 12),
  };

  const resume = await Resume.findOne({ user: user._id }).sort({ createdAt: -1 });
  const first = await generateQuestion({ user, resume, config, difficulty: config.difficulty, turns: [] });

  const session = await InterviewSession.create({
    user: user._id,
    config,
    currentDifficulty: config.difficulty,
    turns: [{ ...first, difficulty: config.difficulty }],
  });
  res.status(201).json({ session });
});

// Voice answers: audio in, transcript + speech numbers out
router.post('/:id/transcribe', upload.single('audio'), async (req, res) => {
  await findOwnSession(req);
  if (!req.file) throw new HttpError(400, 'No audio received.');

  const { text, words } = await transcribeAudio(req.file.buffer, req.file.mimetype);
  if (!text) throw new HttpError(422, 'We could not hear anything. Check your microphone and try again.');
  res.json({ text, speech: analyzeSpeech(words, text) });
});

// Answer the current question: evaluate it, then ask the next one (or finish)
router.post('/:id/answer', async (req, res) => {
  const session = await findOwnSession(req);
  if (session.status === 'completed') throw new HttpError(400, 'This interview is already finished.');

  const answer = String(req.body.answer || '').trim();
  if (!answer) throw new HttpError(400, 'Write or record an answer first.');
  if (answer.length > 5000) throw new HttpError(400, 'Answer is too long (5000 characters max).');

  const index = session.turns.length - 1;
  const turn = session.turns[index];
  if (turn.answer) throw new HttpError(400, 'This question was already answered.');

  turn.answer = answer;
  turn.answerMode = req.body.mode === 'voice' ? 'voice' : 'text';
  turn.speech = turn.answerMode === 'voice' ? req.body.speech || null : null;
  turn.evaluation = await evaluateAnswer({ user: req.user, turn, speech: turn.speech });
  turn.overall = overallScore(turn.evaluation.scores);
  session.currentDifficulty = nextDifficulty(turn.difficulty, turn.overall);

  if (session.turns.length >= session.config.numQuestions) {
    await completeSession(session, req.user);
  } else {
    const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    const next = await generateQuestion({
      user: req.user, resume, config: session.config, difficulty: session.currentDifficulty, turns: session.turns,
    });
    session.turns.push({ ...next, difficulty: session.currentDifficulty });
  }

  await session.save();
  res.json({ evaluatedIndex: index, session });
});

// End early: drops the unanswered question and builds the report
router.post('/:id/finish', async (req, res) => {
  const session = await findOwnSession(req);
  if (session.status === 'completed') return res.json({ session });

  const last = session.turns[session.turns.length - 1];
  if (last && !last.answer) session.turns.pop();
  if (!session.turns.length) throw new HttpError(400, 'Answer at least one question before finishing.');

  await completeSession(session, req.user);
  await session.save();
  res.json({ session });
});

export default router;
