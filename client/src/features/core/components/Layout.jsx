import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDailyReminder } from '../../plan/hooks/useDailyReminder.js';

const links = [
  ['/', 'Dashboard'],
  ['/resume', 'Resume'],
  ['/interview', 'Mock interview'],
  ['/plan', 'Study plan'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  useDailyReminder(user);

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <div className="brand">Interview Coach</div>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
        ))}
        <NavLink to="/onboarding" className={({ isActive }) => (isActive ? 'active' : '')}>Target role and goal</NavLink>
        <div className="spacer" />
        <span className="small" style={{ padding: '0 .75rem', color: '#c9d3e6' }}>{user.name}</span>
        <button onClick={logout}>Log out</button>
      </nav>
      <main><Outlet /></main>
    </div>
  );
}
