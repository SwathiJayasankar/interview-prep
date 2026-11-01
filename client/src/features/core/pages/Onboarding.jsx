import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Marks.jsx';
import ResumeUpload from '../../resume/components/ResumeUpload.jsx';

// Step 1: role + job description + goal.  Step 2: resume.
export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    targetRole: user.targetRole,
    jobDescription: user.jobDescription,
    goalText: user.goal?.text || '',
    goalWeeks: user.goal?.weeks || 6,
    dailyMinutes: user.goal?.dailyMinutes || 90,
    reminderTime: user.reminderTime || '09:00',
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    try {
      const { user: updated } = await api.saveProfile(form);
      setUser(updated);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  }

  if (step === 2) {
    return (
      <div className="narrow">
        <h1>Add your resume</h1>
        <p className="muted">We read it, compare it with the job description, and show you the gaps.</p>
        <ResumeUpload onDone={() => navigate('/resume')} />
        <button className="ghost" onClick={() => navigate('/')}>Skip for now</button>
      </div>
    );
  }

  return (
    <form className="narrow" onSubmit={saveProfile}>
      <h1>What are you preparing for?</h1>
      <label htmlFor="role">Target role</label>
      <input id="role" value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Software Engineer (Full Stack)" required />

      <label htmlFor="jd">Job description</label>
      <textarea id="jd" value={form.jobDescription} onChange={set('jobDescription')} placeholder="Paste the full job posting here. The interviewer asks questions from it." required />

      <label htmlFor="goal">Your goal</label>
      <input id="goal" value={form.goalText} onChange={set('goalText')} placeholder="e.g. Campus placement" />

      <div className="row">
        <div style={{ flex: 1 }}>
          <label htmlFor="weeks">Weeks available</label>
          <input id="weeks" type="number" min="1" max="8" value={form.goalWeeks} onChange={set('goalWeeks')} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="mins">Study minutes per day</label>
          <input id="mins" type="number" min="15" max="240" step="15" value={form.dailyMinutes} onChange={set('dailyMinutes')} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="remind">Daily reminder</label>
          <input id="remind" type="time" value={form.reminderTime} onChange={set('reminderTime')} />
        </div>
      </div>
      <ErrorBox message={error} />
      <p><button>Save and continue</button></p>
    </form>
  );
}
