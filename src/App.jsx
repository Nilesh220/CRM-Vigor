import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Campaigns from './pages/Campaigns';
import Events from './pages/Events';
import ZoneOverview from './pages/vigorspace/ZoneOverview';
import Colleges from './pages/vigorspace/Colleges';
import Vendors from './pages/vigorspace/Vendors';
import CollegeInfluencers from './pages/vigorspace/CollegeInfluencers';
import Influencers from './pages/Influencers';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Leaves from './pages/Leaves';
import OKRs from './pages/OKRs';
import Timeline from './pages/Timeline';
import Sops from './pages/Sops';
import ResetPassword from './pages/ResetPassword';
import CaptureForm from './pages/CaptureForm';

import { ROLE_NAV } from './lib/data';

function AuthGuard({ children }) {
  const { session, ready } = useApp();
  if (!ready) return <div className="loading-page"><div className="spinner"/><span>Loading…</span></div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function PageGuard({ children, pageKey }) {
  const { session, ready } = useApp();
  if (!ready) return <div className="loading-page"><div className="spinner"/><span>Loading…</span></div>;
  if (!session) return <Navigate to="/login" replace />;
  
  const allowed = session.allowedNav || ROLE_NAV[session.role] || [];
  if (pageKey && !allowed.includes(pageKey)) return <Navigate to="/" replace />;
  
  return children;
}

function Router() {
  const { session } = useApp();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route index element={<PageGuard pageKey="dashboard"><Dashboard /></PageGuard>} />
          <Route path="leads" element={<PageGuard pageKey="leads"><Leads /></PageGuard>} />
          <Route path="clients" element={<PageGuard pageKey="clients"><Clients /></PageGuard>} />
          <Route path="campaigns" element={<PageGuard pageKey="campaigns"><Campaigns /></PageGuard>} />
          <Route path="events" element={<PageGuard pageKey="events"><Events /></PageGuard>} />
          <Route path="vigorspace" element={<PageGuard pageKey="vigorspace"><ZoneOverview /></PageGuard>} />
          <Route path="colleges" element={<PageGuard pageKey="colleges"><Colleges /></PageGuard>} />
          <Route path="vendors" element={<PageGuard pageKey="vendors"><Vendors /></PageGuard>} />
          <Route path="vigorspace/college-influencers" element={<PageGuard pageKey="college_influencers"><CollegeInfluencers /></PageGuard>} />
          <Route path="influencers" element={<PageGuard pageKey="influencers"><Influencers /></PageGuard>} />
          <Route path="tasks" element={<PageGuard pageKey="tasks"><Tasks /></PageGuard>} />
          <Route path="finance" element={<PageGuard pageKey="finance"><Finance /></PageGuard>} />
          <Route path="reports" element={<PageGuard pageKey="reports"><Reports /></PageGuard>} />
          <Route path="users" element={<PageGuard pageKey="users"><Users /></PageGuard>} />
          <Route path="leaves" element={<PageGuard pageKey="leaves"><Leaves /></PageGuard>} />
          <Route path="okrs" element={<PageGuard pageKey="okrs"><OKRs /></PageGuard>} />
          <Route path="timeline" element={<PageGuard pageKey="timeline"><Timeline /></PageGuard>} />
          <Route path="sops" element={<PageGuard pageKey="sops"><Sops /></PageGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/capture" element={<CaptureForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
