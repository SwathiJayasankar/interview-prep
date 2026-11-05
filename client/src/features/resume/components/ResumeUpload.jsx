import { useState } from 'react';
import { api } from '../../core/api.js';
import { ErrorBox, Loading } from '../../core/components/Marks.jsx';

// Upload -> parse -> analyze. Calls onDone(resume) when the analysis is ready.
export default function ResumeUpload({ onDone, label = 'Upload and analyze' }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      setStep('Reading your resume...');
      await api.uploadResume(file);
      setStep('Comparing it with the job description...');
      const { resume } = await api.analyzeResume();
      onDone(resume);
    } catch (err) {
      setError(err.message);
    } finally {
      setStep('');
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="resume-file">Resume (PDF or DOCX, up to 5 MB)</label>
      <input id="resume-file" type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files[0])} />
      <ErrorBox message={error} />
      <p>
        <button disabled={!file || Boolean(step)}>{label}</button>
      </p>
      {step && <Loading>{step} This takes about 10 seconds.</Loading>}
    </form>
  );
}
