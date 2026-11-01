import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // Onboarding: what the student is aiming for
    targetRole: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    goal: {
      text: { type: String, default: '' }, // e.g. "Campus placement"
      weeks: { type: Number, default: 6 }, // time available
      dailyMinutes: { type: Number, default: 90 },
    },
    reminderTime: { type: String, default: '09:00' }, // HH:MM, used by the browser reminder
    onboardingDone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
