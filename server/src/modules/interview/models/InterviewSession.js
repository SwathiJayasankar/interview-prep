import mongoose from 'mongoose';
const { Schema } = mongoose;

// Feedback for one answer
const evaluationSchema = new Schema(
  {
    scores: { correctness: Number, clarity: Number, structure: Number, depth: Number, confidence: Number },
    strengths: [String],
    improvements: [String],
    star: { applicable: Boolean, situation: Boolean, task: Boolean, action: Boolean, result: Boolean, feedback: String },
    idealAnswer: String,
  },
  { _id: false }
);

// One question + the student's answer + feedback
const turnSchema = new Schema({
  question: String,
  kind: String, // 'technical' | 'behavioral'
  topic: String,
  difficulty: String,
  isFollowUp: { type: Boolean, default: false },
  answer: String,
  answerMode: String, // 'text' | 'voice'
  speech: Schema.Types.Mixed, // pace, fillers, pauses (voice answers only)
  evaluation: evaluationSchema,
  overall: Number, // weighted rubric score, 0-10
});

const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    config: { mode: String, difficulty: String, style: String, numQuestions: Number },
    currentDifficulty: String,
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    turns: [turnSchema],
    summary: {
      overall: Number,
      rubric: Schema.Types.Mixed,
      byTopic: [{ topic: String, avg: Number, count: Number }],
      text: String,
      strengths: [String],
      weaknesses: [String],
      nextSteps: [String],
    },
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('InterviewSession', sessionSchema);
