import { Mark, Ledger, tone } from '../../core/components/Marks.jsx';

// Feedback for one answered question: rubric, STAR check, speech stats, tips, ideal answer.
export default function TurnFeedback({ turn }) {
  const ev = turn.evaluation;
  const sp = turn.speech;
  if (!ev) return null;

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start', gap: '2rem' }}>
        <Mark score={turn.overall} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <Ledger rows={Object.entries(ev.scores).map(([label, value]) => ({ label, value }))} />
        </div>
      </div>

      {ev.star?.applicable && (
        <>
          <h3>STAR check</h3>
          <div className="chips">
            {['situation', 'task', 'action', 'result'].map((part) => (
              <span key={part} className={`chip ${ev.star[part] ? 'good' : 'bad'}`}>
                {ev.star[part] ? '✓' : '✗'} {part}
              </span>
            ))}
          </div>
          {ev.star.feedback && <p>{ev.star.feedback}</p>}
        </>
      )}

      {sp?.wpm && (
        <>
          <h3>Speech</h3>
          <div className="chips">
            <span className={`chip ${sp.paceLabel === 'good' ? 'good' : 'mid'}`}>{sp.wpm} words/min ({sp.paceLabel} pace)</span>
            <span className={`chip ${tone(Math.max(0, 5 - sp.fillerCount), 5)}`}>
              {sp.fillerCount} filler words{sp.fillerCount ? `: ${Object.entries(sp.fillers).map(([w, n]) => `${w} ×${n}`).join(', ')}` : ''}
            </span>
            <span className={`chip ${sp.pauseCount > 3 ? 'mid' : 'good'}`}>{sp.pauseCount} long pauses (longest {sp.longestPauseSec}s)</span>
            <span className="chip">{sp.durationSec}s speaking</span>
          </div>
        </>
      )}

      <div className="grid2">
        <div>
          <h3>What worked</h3>
          <ul>{ev.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <h3>Improve next time</h3>
          <ul>{ev.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>

      <details>
        <summary>Compare with a model answer</summary>
        <p className="answer">{ev.idealAnswer}</p>
      </details>
    </div>
  );
}
