import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, localToday } from '../../core/api.js';
import { Loading, ErrorBox } from '../../core/components/Marks.jsx';

export default function PlanPage() {
  const [data, setData] = useState(null); // { plan, tasks }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.plan().then(setData).catch((e) => setError(e.message));
  }, []);

  async function generate() {
    if (data.plan && !confirm('Replace your current plan and progress with a new one?')) return;
    setBusy(true);
    setError('');
    try {
      setData(await api.generatePlan());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task) {
    // update the screen first, then tell the server
    const tasks = data.tasks.map((t) => (t._id === task._id ? { ...t, done: !t.done } : t));
    setData({ ...data, tasks });
    api.toggleTask(task._id, !task.done).catch((e) => setError(e.message));
  }

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;

  const today = localToday();
  const doneCount = data.tasks.filter((t) => t.done).length;
  const percent = data.tasks.length ? Math.round((doneCount / data.tasks.length) * 100) : 0;

  return (
    <div>
      <div className="row between">
        <h1>Study plan</h1>
        <button onClick={generate} disabled={busy}>{data.plan ? 'Rebuild plan' : 'Build my plan'}</button>
      </div>
      {busy && <Loading>Building your roadmap. This takes about 20 seconds.</Loading>}
      <ErrorBox message={error} />

      {!data.plan ? (
        <p className="muted">The plan is built from the skills missing on your resume and the topics you scored lowest on in mock interviews. For the best plan, <Link to="/resume">analyze your resume</Link> and take one mock interview first.</p>
      ) : (
        <>
          <p>{doneCount} of {data.tasks.length} tasks done ({percent}%)</p>
          <div className="bar" style={{ maxWidth: 420 }}><i style={{ width: `${percent}%` }} /></div>
          <p className="small muted" style={{ marginTop: '.75rem' }}>
            Based on: {[...data.plan.basedOn.missingSkills, ...data.plan.basedOn.weakTopics].join(', ') || 'your job description'}.
            Resource links open a search, so you can pick the video or article you like best.
          </p>

          {data.plan.weeks.map((w) => (
            <section className="block" key={w.week}>
              <h2>Week {w.week}: {w.focus}</h2>
              <ul className="small muted">{w.goals.map((g) => <li key={g}>{g}</li>)}</ul>
              {data.tasks.filter((t) => t.week === w.week).map((t) => (
                <div key={t._id} className={`item task ${t.done ? 'done' : ''} ${t.dueDay === today && !t.done ? 'today' : ''}`}>
                  <input type="checkbox" checked={t.done} onChange={() => toggle(t)} aria-label={`Mark "${t.title}" as done`} />
                  <div>
                    <h3>{t.title}</h3>
                    <p className="small muted">
                      {t.dueDay === today ? 'Today' : new Date(`${t.dueDay}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {t.estMinutes} min
                    </p>
                    <p>{t.description}</p>
                    <div className="chips">
                      {t.resources.map((r) => <a key={r.url} className="chip" href={r.url} target="_blank" rel="noreferrer">{r.kind}: {r.title}</a>)}
                      {t.cadence === 'weekly' && <Link className="chip good" to="/interview">Start mock interview</Link>}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
