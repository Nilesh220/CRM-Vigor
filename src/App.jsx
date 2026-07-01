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
import MapView from './pages/vigorspace/MapView';
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

// ── Mobile Browser Block ────────────────────────────────────────────
// Blocks ALL mobile browsers (Android + iOS) before any page loads.
// Exceptions: /capture public form, and native Capacitor app.
function MobileBlockWall() {
  const ua = navigator.userAgent || '';
  const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(ua);
  const isCapacitorApp = typeof window !== 'undefined' && !!(window.Capacitor);
  const isCapturePage = window.location.pathname.startsWith('/capture');

  if (!isMobileBrowser || isCapacitorApp || isCapturePage) return null;

  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Glow ring + lock */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28, boxShadow: '0 0 50px rgba(37,99,235,.5), 0 0 100px rgba(124,58,237,.2)',
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '.95rem', letterSpacing: '.05em' }}>
          VIGORLAUNCHPAD
        </span>
      </div>

      <h1 style={{
        color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 800,
        marginBottom: 10, lineHeight: 1.3,
      }}>
        Desktop Access Only
      </h1>
      <p style={{
        color: '#64748b', fontSize: '.85rem', lineHeight: 1.65,
        maxWidth: 290, marginBottom: 32,
      }}>
        The CRM portal is not accessible via a mobile browser. Use a{' '}
        <strong style={{ color: '#94a3b8' }}>laptop or desktop</strong> to sign in.
      </p>

      {/* Android card */}
      {!isIOS && (
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 16,
          width: '100%', maxWidth: 300,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.42.07 2.38.79 3.2.8 1.21-.24 2.38-1.01 3.68-.9 1.57.14 2.76.79 3.52 2.03-3.28 1.97-2.5 6.27.6 7.47-.66 1.66-1.5 3.3-3 4.48zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '.83rem' }}>Android App Available</div>
              <div style={{ color: '#475569', fontSize: '.72rem' }}>Sideload APK · No Play Store needed</div>
            </div>
          </div>
          <p style={{ color: '#475569', fontSize: '.75rem', lineHeight: 1.5, marginBottom: 12, textAlign: 'left' }}>
            Install the VigorLaunchpad app directly. Screenshots are blocked inside the app.
          </p>
          <a
            href="#"
            onClick={e => { e.preventDefault(); alert('Contact your admin to get the VigorLaunchpad APK file.'); }}
            style={{
              display: 'block', padding: '10px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff', fontWeight: 700, fontSize: '.8rem',
              borderRadius: 10, textDecoration: 'none', textAlign: 'center',
            }}
          >
            ↓ Get the Android App
          </a>
        </div>
      )}

      {/* iOS notice */}
      {isIOS && (
        <div style={{
          background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.18)',
          borderRadius: 14, padding: '16px 18px', maxWidth: 300, width: '100%',
        }}>
          <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🍎</div>
          <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '.82rem', marginBottom: 6 }}>
            iPhone / iPad
          </div>
          <div style={{ color: '#94a3b8', fontSize: '.76rem', lineHeight: 1.55 }}>
            iOS does not support app sideloading. Please access VigorLaunchpad from a
            <strong style={{ color: '#e2e8f0' }}> MacBook or Windows laptop</strong>.
          </div>
        </div>
      )}

      <p style={{ color: '#1e293b', fontSize: '.68rem', marginTop: 28 }}>
        © {new Date().getFullYear()} VigorLaunchpad · Internal use only
      </p>
    </div>
  );
}

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
          <Route path="map-view" element={<PageGuard pageKey="vigorspace"><MapView /></PageGuard>} />
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
      <MobileBlockWall />
      <Router />
    </AppProvider>
  );
}
