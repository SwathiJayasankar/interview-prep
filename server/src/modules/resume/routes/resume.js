import { Router } from 'express';
import multer from 'multer';
import Resume from '../models/Resume.js';
import { extractText, structureResume } from '../services/resumeParser.js';
import { analyzeResume } from '../services/resumeAnalyzer.js';
import { HttpError } from '../../core/middleware/errorHandler.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// The raw text is large and the browser does not need it.
const publicResume = (r) => r && ({ id: r._id, fileName: r.fileName, parsed: r.parsed, analysis: r.analysis, analyzedAt: r.analyzedAt, createdAt: r.createdAt });

// Upload + parse
router.post('/', upload.single('resume'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach your resume as a PDF or DOCX file.');

  const rawText = await extractText(req.file);
  if (rawText.trim().length < 200) {
    throw new HttpError(422, 'Could not read text from this file. If it is a scanned image, export a text-based PDF instead.');
  }
  const parsed = await structureResume(rawText);
  const resume = await Resume.create({ user: req.user._id, fileName: req.file.originalname, rawText, parsed });
  res.status(201).json({ resume: publicResume(resume) });
});

router.get('/latest', async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ resume: publicResume(resume) });
});

// Analyze the latest resume against the job description saved in the profile
router.post('/analyze', async (req, res) => {
  if (!req.user.jobDescription) throw new HttpError(400, 'Add a target role and job description first.');
  const resume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!resume) throw new HttpError(404, 'Upload a resume first.');

  resume.analysis = await analyzeResume({ resume, user: req.user });
  resume.analyzedAt = new Date();
  await resume.save();
  res.json({ resume: publicResume(resume) });
});

export default router;
