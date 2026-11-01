import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { api, localToday } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Ledger, Loading, ErrorBox, tone } from '../components/Marks.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [past, setPast] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.analytics().then(setStats).catch((e) => setError(e.message));
    api.plan().then((r) => setTasks(r.tasks)).catch(() => {});
    api.sessions().then((r) => setPast(r.sessions)).catch(() => {});
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Loading />;

  const r = stats.readiness;
  const todayTasks = tasks.filter((t) => t.dueDay === localToday() && !t.done);
  const trend = stats.trend.map((t, i) => ({ name: `#${i + 1}`, score: t.overall }));

  return (
    <div>
      <h1>Hi {user.name.split(' ')[0]}</h1>
      <p className="muted">Preparing for {user.targetRole}{user.goal?.text ? ` · ${user.goal.text}` : ''}</p>

      <section className="block">
        <div className="row" style={{ alignItems: 'flex-start', gap: '2.5rem' }}>
          <div>
            <h3>Interview readiness</h3>
            <div className={`mark ${tone(r.score, 100)}`} style={{ fontSize: '4rem' }}>{r.score}<small> / 100</small></div>
            <p className="muted">{r.label}</p>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Ledger rows={r.components.filter((c) => c.score !== null).map((c) => ({ label: c.label, value: c.score, max: 100 }))} />
            {r.components.some((c) => c.score === null) && (
              <p className="small muted">Not scored yet: {r.components.filter((c) => c.score === null).map((c) => c.label.toLowerCase()).join(', ')}.</p>
            )}
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Today</h2>
        {todayTasks.length ? todayTasks.map((t) => <p key={t._id}>• {t.title} <span className="muted">({t.estMinutes} min)</span></p>) : <p className="muted">No tasks due today.</p>}
        <Link className="btn ghost" to="/plan">Open study plan</Link>{' '}
        <Link className="btn" to="/interview">Start a mock interview</Link>
      </section>

      {stats.sessionsCompleted === 0 ? (
        <section className="block"><p className="muted">Complete a mock interview to see score trends and your strongest and weakest topics.</p></section>
      ) : (
        <>
          <section className="block">
            <h2>Score trend</h2>
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid stroke="#d6dde8" vertical={false} />
                  <XAxis dataKey="name" /><YAxis domain={[0, 10]} width={30} /><Tooltip />
                  <Line dataKey="score" stroke="#14213d" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="block grid2">
            <div>
              <h2>By skill area</h2>
              <Ledger rows={Object.entries(stats.rubric).map(([label, value]) => ({ label, value }))} />
            </div>
            <div>
              <h2>Topics to work on</h2>
              <div style={{ height: Math.max(120, stats.weakest.length * 44) }}>
                <ResponsiveContainer>
                  <BarChart data={stats.weakest} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 10]} /><YAxis type="category" dataKey="topic" width={110} /><Tooltip />
                    <Bar dataKey="avg" fill="#b83227" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {stats.strongest.length > 0 && <p className="small muted">Strongest: {stats.strongest.map((t) => `${t.topic} (${t.avg})`).join(', ')}</p>}
            </div>
          </section>

          <section className="block">
            <h2>Session history</h2>
            {past.filter((s) => s.status === 'completed').map((s) => (
              <div className="item row between" key={s._id}>
                <Link to={`/interview/${s._id}`}>{new Date(s.completedAt).toLocaleString()}</Link>
                <span className="muted">{s.summary.overall} / 10 · view transcript</span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
