import mongoose from 'mongoose';
const { Schema } = mongoose;

// A plan is the weekly roadmap. The individual to-dos live in Task.
const planSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDay: String, // 'YYYY-MM-DD'
    weeks: [{ week: Number, focus: String, goals: [String] }],
    basedOn: { missingSkills: [String], weakTopics: [String] },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);

const taskSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  week: Number,
  day: Number,
  dueDay: String, // 'YYYY-MM-DD'
  cadence: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  title: String,
  description: String,
  topic: String,
  estMinutes: Number,
  resources: [{ title: String, kind: String, url: String }],
  done: { type: Boolean, default: false },
  doneAt: Date,
});

export const Task = mongoose.model('Task', taskSchema);
