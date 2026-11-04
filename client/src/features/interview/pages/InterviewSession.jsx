import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../core/api.js';
import { Mark, Ledger, Loading, ErrorBox } from '../../core/components/Marks.jsx';
import TurnFeedback from '../components/TurnFeedback.jsx';
import { useRecorder } from '../hooks/useRecorder.js';
import { useSpeak } from '../hooks/useSpeak.js';

export default function InterviewSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.session(id).then((r) => setSession(r.session)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!session) return <Loading />;
  return session.status === 'completed'
    ? <Report session={session} />
    : <Room session={session} onChange={setSession} />;
}

// ------------------------------------------------------------ live interview

function Room({ session, onChange }) {
  const turn = session.turns[session.turns.length - 1]; // the unanswered question
  const [mode, setMode] = useState(session.config.mode);
  const [text, setText] = useState('');
  const [speech, setSpeech] = useState(null); // numbers from the last recording
  const [busy, setBusy] = useState(''); // '', 'transcribing', 'evaluating'
  const [error, setError] = useState('');
  const [previous, setPrevious] = useState(null); // feedback for the answer just given
  const [readAloud, setReadAloud] = useState(false);
  const recorder = useRecorder();
  const speak = useSpeak();

  // Read each new question aloud when the interviewer voice is on
  useEffect(() => {
    if (readAloud) speak(turn.question);
  }, [turn.question, readAloud, speak]);

  async function toggleRecording() {
    setError('');
    try {
      if (!recorder.recording) return await recorder.start();
      const blob = await recorder.stop();
      setBusy('transcribing');
      const result = await api.transcribe(session._id, blob);
      setText(result.text);
      setSpeech(result.speech);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access is blocked. Allow it in your browser, or switch to typing.' : err.message);
    } finally {
      setBusy('');
    }
  }

  async function submit() {
    setError('');
    setBusy('evaluating');
    try {
      const result = await api.answer(session._id, { answer: text, mode: speech ? 'voice' : 'text', speech });
      setPrevious(result.session.turns[result.evaluatedIndex]);
      setText('');
      setSpeech(null);
      onChange(result.session);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function endEarly() {
    if (!confirm('End the interview now? Your unanswered question will be dropped.')) return;
    try {
      onChange((await api.finishInterview(session._id)).session);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="row between">
        <h1>Question {session.turns.length} of {session.config.numQuestions}</h1>
        <label style={{ margin: 0, fontWeight: 400 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} /> Read questions aloud
        </label>
      </div>

      <div className="paper">
        <div className="chips">
          <span className="chip">{turn.kind}</span>
          <span className="chip">{turn.topic}</span>
          <span className="chip">{turn.difficulty}</span>
          {turn.isFollowUp && <span className="chip mid">follow-up</span>}
        </div>
        <p className="q">{turn.question}</p>
      </div>

      <div className="tabs" role="group" aria-label="Answer mode">
        <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Type</button>
        <button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}>Speak</button>
      </div>

      {mode === 'voice' && (
        <p>
          <button onClick={toggleRecording} disabled={busy !== ''} className={recorder.recording ? 'danger' : ''}>
            {recorder.recording ? `Stop recording (${recorder.seconds}s)` : text ? 'Record again' : 'Start recording'}
          </button>
          {busy === 'transcribing' && <span className="muted"> <span className="spinner" />Transcribing...</span>}
        </p>
      )}

      <label htmlFor="answer">{mode === 'voice' ? 'Your transcript (fix any mistakes before sending)' : 'Your answer'}</label>
      <textarea id="answer" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'voice' ? 'Your spoken answer appears here.' : 'Explain your thinking. Examples help.'} />

      {speech?.wpm && <div className="chips"><span className="chip">{speech.wpm} words/min</span><span className="chip">{speech.fillerCount} fillers</span><span className="chip">{speech.pauseCount} long pauses</span></div>}
      <ErrorBox message={error} />

      <div className="row">
        <button onClick={submit} disabled={!text.trim() || busy !== '' || recorder.recording}>Submit answer</button>
        <button className="ghost" onClick={endEarly} disabled={busy !== ''}>End interview</button>
        {busy === 'evaluating' && <span className="muted"><span className="spinner" />Scoring your answer...</span>}
      </div>

      {previous && (
        <section className="block">
          <h2>Feedback on your last answer</h2>
          <p className="muted">{previous.question}</p>
          <TurnFeedback turn={previous} />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------- report, transcript and replay

function transcriptText(session) {
  return session.turns
    .map((t, i) => `Q${i + 1} (${t.topic}, ${t.difficulty}): ${t.question}\n\nAnswer: ${t.answer}\n\nScore: ${t.overall}/10\nImprove: ${t.evaluation.improvements.join(' | ')}`)
    .join('\n\n-----\n\n');
}

function Report({ session }) {
  const [selected, setSelected] = useState(0);
  const s = session.summary;
  const turn = session.turns[selected];

  function download() {
    const url = URL.createObjectURL(new Blob([transcriptText(session)], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'interview-transcript.txt' });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Interview report</h1>
      <p className="muted">{new Date(session.completedAt).toLocaleString()} · {session.turns.length} questions</p>

      <div className="row" style={{ alignItems: 'flex-start', gap: '2rem' }}>
        <div><h3>Overall</h3><Mark score={s.overall} /></div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p>{s.text}</p>
          <Ledger rows={Object.entries(s.rubric).map(([label, value]) => ({ label, value }))} />
        </div>
      </div>

      <div className="grid2">
        <div><h3>Strengths</h3><ul>{s.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Work on</h3><ul>{s.weaknesses.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <h3>Next steps</h3>
      <ul>{s.nextSteps.map((x) => <li key={x}>{x}</li>)}</ul>

      <section className="block">
        <div className="row between">
          <h2>Replay, question by question</h2>
          <button className="ghost" onClick={download}>Download transcript</button>
        </div>
        <div className="tabs" role="tablist">
          {session.turns.map((t, i) => (
            <button key={t._id} role="tab" aria-selected={i === selected} className={i === selected ? 'active' : ''} onClick={() => setSelected(i)}>
              Q{i + 1} · {t.overall}
            </button>
          ))}
        </div>

        <div className="paper">
          <div className="chips"><span className="chip">{turn.kind}</span><span className="chip">{turn.topic}</span><span className="chip">{turn.difficulty}</span>{turn.isFollowUp && <span className="chip mid">follow-up</span>}</div>
          <p className="q">{turn.question}</p>
        </div>
        <h3 style={{ marginTop: '1rem' }}>Your answer ({turn.answerMode})</h3>
        <p className="answer">{turn.answer}</p>
        <TurnFeedback turn={turn} />
      </section>
    </div>
  );
}
