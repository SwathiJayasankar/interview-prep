// Small display pieces for scores. "tone" picks green / amber / red.

export const tone = (score, max = 10) => {
  const pct = score / max;
  return pct >= 0.7 ? 'good' : pct >= 0.5 ? 'mid' : 'bad';
};

// A big score such as 7.5 / 10
export function Mark({ score, max = 10 }) {
  return (
    <div className={`mark ${tone(score, max)}`}>
      {score}
      <small> / {max}</small>
    </div>
  );
}

// Rows of "label — bar — value". `rows` = [{ label, value, max }]
export function Ledger({ rows }) {
  return (
    <div className="ledger">
      {rows.map((r) => (
        <div className="line" key={r.label}>
          <span className="label">{r.label}</span>
          <div className={`bar ${tone(r.value, r.max || 10)}`}><i style={{ width: `${(r.value / (r.max || 10)) * 100}%` }} /></div>
          <span className="val">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export const Loading = ({ children = 'Loading...' }) => <p className="muted"><span className="spinner" />{children}</p>;
export const ErrorBox = ({ message }) => (message ? <div className="error" role="alert">{message}</div> : null);
