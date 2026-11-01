import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './features/core/context/AuthContext.jsx';
import Layout from './features/core/components/Layout.jsx';
import { Loading } from './features/core/components/Marks.jsx';
import AuthPage from './features/core/pages/AuthPage.jsx';
import Onboarding from './features/core/pages/Onboarding.jsx';
import Dashboard from './features/core/pages/Dashboard.jsx';
import ResumePage from './features/resume/pages/ResumePage.jsx';
import InterviewSetup from './features/interview/pages/InterviewSetup.jsx';
import InterviewSession from './features/interview/pages/InterviewSession.jsx';
import PlanPage from './features/plan/pages/PlanPage.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><Loading /></div>;
  if (!user) return <AuthPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/onboarding" element={<Onboarding />} />
        {/* New users must finish onboarding first */}
        <Route path="/" element={user.onboardingDone ? <Dashboard /> : <Navigate to="/onboarding" />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/interview" element={<InterviewSetup />} />
        <Route path="/interview/:id" element={<InterviewSession />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
