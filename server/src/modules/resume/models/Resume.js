import mongoose from 'mongoose';

// parsed   = structured data pulled out of the file (skills, projects, ...)
// analysis = ATS score, skill gap, recommendations (filled by POST /api/resume/analyze)
// Both are free-form objects (Mixed) because their shape comes from the AI.
const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: String,
    rawText: String,
    parsed: mongoose.Schema.Types.Mixed,
    analysis: mongoose.Schema.Types.Mixed,
    analyzedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Resume', resumeSchema);
