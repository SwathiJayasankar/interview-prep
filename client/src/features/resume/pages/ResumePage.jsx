import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../core/api.js';
import { Mark, Ledger, Loading, ErrorBox, tone } from '../../core/components/Marks.jsx';
import ResumeUpload from '../components/ResumeUpload.jsx';

export default function ResumePage() {
  const [resume, setResume] = useState(undefined); // undefined = still loading, null = none uploaded
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    api.latestResume().then((r) => setResume(r.resume)).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (resume === undefined) return <Loading />;
  if (!resume || replacing) {
    return (
      <div className="narrow">
        <h1>Resume</h1>
        <ResumeUpload onDone={(r) => { setResume(r); setReplacing(false); }} />
      </div>
    );
  }

  const a = resume.analysis;
  const p = resume.parsed;

  return (
    <div>
      <div className="row between">
        <h1>Resume analysis</h1>
        <button className="ghost" onClick={() => setReplacing(true)}>Upload a new version</button>
      </div>
      <p className="muted">{resume.fileName}</p>

      {!a ? (
        <p><button onClick={() => api.analyzeResume().then((r) => setResume(r.resume)).catch((e) => setError(e.message))}>Analyze against my job description</button></p>
      ) : (
        <>
          <section className="block">
            <div className="row" style={{ alignItems: 'flex-start', gap: '2rem' }}>
              <div><h3>ATS score</h3><Mark score={a.atsScore} max={100} /></div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <p>{a.summary}</p>
                <Ledger rows={a.atsBreakdown.map((c) => ({ label: c.label, value: c.points, max: c.max }))} />
              </div>
            </div>
            {a.formattingIssues.length > 0 && (
              <>
                <h3>Formatting and content fixes</h3>
                <ul>{a.formattingIssues.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            )}
          </section>

          <section className="block">
            <h2>Skill gap</h2>
            <div className="grid2">
              <div>
                <h3>Required skills you have</h3>
                <div className="chips">{a.requiredSkills.filter((s) => s.found).map((s) => <span key={s.skill} className="chip good" title={s.evidence}>{s.skill}</span>)}</div>
                <h3>Required skills missing</h3>
                <div className="chips">{a.missingRequired.length ? a.missingRequired.map((s) => <span key={s} className="chip bad">{s}</span>) : <span className="muted">None. Nice.</span>}</div>
              </div>
              <div>
                <h3>Nice-to-have skills missing</h3>
                <div className="chips">{a.missingPreferred.length ? a.missingPreferred.map((s) => <span key={s} className="chip mid">{s}</span>) : <span className="muted">None.</span>}</div>
                <h3>Other gaps</h3>
                <ul>{a.otherGaps.map((g) => <li key={g.area}><strong>{g.area}:</strong> {g.detail}</li>)}</ul>
              </div>
            </div>
          </section>

          <section className="block">
            <h2>How to close the gaps</h2>
            {a.recommendations.map((r) => (
              <div className="item" key={r.skill}>
                <div className="row between">
                  <h3>{r.skill}</h3>
                  <span className={`chip ${r.priority === 'high' ? 'bad' : r.priority === 'medium' ? 'mid' : ''}`}>{r.priority} priority, about {r.estimatedWeeks} wk</span>
                </div>
                <p>{r.why}</p>
                <ol>{r.learningPath.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
            ))}
            <p><Link className="btn" to="/plan">Turn this into a study plan</Link></p>
          </section>

          {a.bulletRewrites.length > 0 && (
            <section className="block">
              <h2>Stronger bullet points</h2>
              <p className="muted small">Fill in the [brackets] with your real numbers. Never claim results you did not achieve.</p>
              {a.bulletRewrites.map((b) => (
                <div className="item" key={b.original}>
                  <div className="compare">
                    <div className="before"><strong>Before</strong><br />{b.original}</div>
                    <div className="after"><strong>After</strong><br />{b.improved}</div>
                  </div>
                  <p className="small muted" style={{ marginTop: '.5rem' }}>{b.why}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <section className="block">
        <details>
          <summary>What we read from your resume</summary>
          <p><strong>Skills:</strong> {p.skills.join(', ') || 'none found'}</p>
          <p><strong>Education:</strong> {p.education.map((e) => `${e.degree}, ${e.institution} ${e.years}`).join('; ') || 'none found'}</p>
          <p><strong>Experience:</strong> {p.experience.map((e) => `${e.role} at ${e.company}`).join('; ') || 'none found'}</p>
          <p><strong>Projects:</strong> {p.projects.map((x) => x.name).join('; ') || 'none found'}</p>
        </details>
      </section>
    </div>
  );
}
