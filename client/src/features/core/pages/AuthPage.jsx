import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Marks.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await (isRegister ? register(form) : login(form));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="center-screen">
      <form className="narrow" style={{ width: '100%' }} onSubmit={submit}>
        <h1>Practice the interview before it counts.</h1>
        <p className="muted">Upload your resume, practice with an AI interviewer, and follow a plan built from your weak spots.</p>
        {isRegister && (<><label htmlFor="name">Name</label><input id="name" value={form.name} onChange={set('name')} required /></>)}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={form.password} onChange={set('password')} required minLength={6} />
        <ErrorBox message={error} />
        <p><button>{isRegister ? 'Create account' : 'Log in'}</button></p>
        <button type="button" className="ghost" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'I already have an account' : 'I need an account'}
        </button>
      </form>
    </div>
  );
}
