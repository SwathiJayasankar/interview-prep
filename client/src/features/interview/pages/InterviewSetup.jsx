import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../core/api.js';
import { Loading, ErrorBox } from '../../core/components/Marks.jsx';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [past, setPast] = useState([]);
  const [form, setForm] = useState({ mode: 'text', difficulty: 'medium', style: 'general', numQuestions: 6 });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    api.interviewOptions().then(setOptions).catch((e) => setError(e.message));
    api.sessions().then((r) => setPast(r.sessions)).catch(() => {});
  }, []);

  async function start(e) {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      const { session } = await api.startInterview(form);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  if (!options) return error ? <ErrorBox message={error} /> : <Loading />;
  const style = options.styles.find((s) => s.id === form.style);

  return (
    <div>
      <h1>Mock interview</h1>
      <p className="muted">Questions come from your job description and resume. The interviewer follows up on weak answers and raises the difficulty when you do well.</p>

      <form className="narrow" onSubmit={start}>
        <label htmlFor="style">Interview style</label>
        <select id="style" value={form.style} onChange={set('style')}>
          {options.styles.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <p className="small muted">{style.guide}</p>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="diff">Starting difficulty</label>
            <select id="diff" value={form.difficulty} onChange={set('difficulty')}>
              {options.difficulties.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="num">Questions</label>
            <select id="num" value={form.numQuestions} onChange={set('numQuestions')}>
              {[3, 5, 6, 8, 10].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="mode">Answer by</label>
            <select id="mode" value={form.mode} onChange={set('mode')}>
              <option value="text">Typing</option>
              <option value="voice">Speaking</option>
            </select>
          </div>
        </div>
        <ErrorBox message={error} />
        <p><button disabled={starting}>{starting ? 'Preparing your first question...' : 'Start interview'}</button></p>
      </form>

      <section className="block">
        <h2>Past interviews</h2>
        {past.length === 0 && <p className="muted">Nothing yet. Your first session will show up here with a full transcript.</p>}
        {past.map((s) => (
          <div className="item row between" key={s._id}>
            <Link to={`/interview/${s._id}`}>
              {new Date(s.createdAt).toLocaleDateString()} · {options.styles.find((x) => x.id === s.config.style)?.label}
            </Link>
            <span className="muted">{s.status === 'completed' ? `${s.summary.overall} / 10` : 'unfinished'}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
