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

/* ══════════════════════════════════════════════════════════════════════
   MOBILE BROWSER BLOCK WALL
   Blocks Android + iOS browsers. Matches the desktop login-left theme.
   Exceptions: /capture (public form), native Capacitor app.
   ══════════════════════════════════════════════════════════════════════ */
function MobileBlockWall() {
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  const isTouchDevice = (navigator.maxTouchPoints > 1) || ('ontouchstart' in window);
  const isSmallScreen = window.screen.width < 1025 && window.screen.height < 1025;

  let isMobileBrowser = false;

  if (isMobileUA) {
    isMobileBrowser = true;
  } else if (isWindows) {
    isMobileBrowser = false; // Never block Windows PCs/laptops
  } else if (isMac) {
    // iPadOS in "Desktop Mode" reports as Macintosh but has touch points
    if (isTouchDevice) {
      isMobileBrowser = true;
    }
  } else if (isTouchDevice && isSmallScreen) {
    // Android "Desktop Mode" (reports as Linux/X11 with touch and small screen size)
    isMobileBrowser = true;
  }

  const isCapacitorApp = typeof window !== 'undefined' && !!(window.Capacitor);
  const isCapturePage = window.location.pathname.startsWith('/capture');

  if (!isMobileBrowser || isCapacitorApp || isCapturePage) return null;

  const isIOS = isMobileUA ? /iPhone|iPad|iPod/i.test(ua) : (isMac && isTouchDevice);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(150deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 28px', textAlign: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Decorative glow orbs — same as login-left */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,.3) 0%, transparent 70%)',
        top: -120, right: -100, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(96,165,250,.2) 0%, transparent 70%)',
        bottom: -60, left: -60, pointerEvents: 'none',
      }} />

      {/* Logo card — same style as desktop login */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: '10px 18px',
        display: 'inline-flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        marginBottom: 36, zIndex: 1,
      }}>
        <img src="/vigor-logo-new-01.png" alt="VigorLaunchpad"
          style={{ height: 28, width: 'auto', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* Lock icon with subtle glass ring */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(255,255,255,.07)',
        border: '2px solid rgba(255,255,255,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, zIndex: 1,
        boxShadow: '0 0 40px rgba(96,165,250,.2)',
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
          stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Title — uses same em highlight as login hero */}
      <h1 style={{
        color: '#fff', fontSize: '1.5rem', fontWeight: 800,
        lineHeight: 1.2, marginBottom: 8, zIndex: 1,
      }}>
        Desktop <em style={{ fontStyle: 'normal', color: '#93c5fd' }}>Access Only</em>
      </h1>
      <p style={{
        color: 'rgba(255,255,255,.55)', fontSize: '.84rem', lineHeight: 1.65,
        maxWidth: 300, marginBottom: 28, zIndex: 1,
      }}>
        The VigorLaunchpad CRM portal is built for desktop browsers.
        Open this link on your{' '}
        <strong style={{ color: 'rgba(255,255,255,.85)' }}>laptop or computer</strong> to sign in.
      </p>

      {/* Feature dots — mirrors login-left feature list */}
      <div style={{
        textAlign: 'left', width: '100%', maxWidth: 300,
        marginBottom: 28, zIndex: 1,
      }}>
        {[
          'Campaign, task & event management',
          '500+ college database with fest calendars',
          'Influencer tiers & creator shortlists',
          'Finance, reports & team workflows',
        ].map(f => (
          <div key={f} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '.78rem', color: 'rgba(255,255,255,.65)',
            marginBottom: 7,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#60a5fa', flexShrink: 0,
            }} />
            {f}
          </div>
        ))}
      </div>

      {/* Android card */}
      {!isIOS && (
        <div style={{
          background: 'rgba(255,255,255,.05)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14, padding: '16px 18px',
          width: '100%', maxWidth: 300, zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(96,165,250,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '.8rem' }}>Android App</div>
              <div style={{ color: 'rgba(255,255,255,.35)', fontSize: '.7rem' }}>Direct APK · Screenshot protected</div>
            </div>
          </div>
          <button
            onClick={() => alert('Android app coming soon. Contact your admin for updates.')}
            style={{
              display: 'block', width: '100%', padding: '10px',
              background: 'rgba(37,99,235,.25)',
              border: '1px solid rgba(96,165,250,.25)',
              color: '#93c5fd', fontWeight: 700, fontSize: '.8rem',
              borderRadius: 10, cursor: 'pointer', textAlign: 'center',
            }}
          >
            Coming Soon
          </button>
        </div>
      )}

      {/* iOS notice */}
      {isIOS && (
        <div style={{
          background: 'rgba(255,255,255,.05)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14, padding: '16px 18px',
          maxWidth: 300, width: '100%', zIndex: 1,
        }}>
          <div style={{ color: '#93c5fd', fontWeight: 700, fontSize: '.82rem', marginBottom: 6 }}>
            📱 iPhone / iPad
          </div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '.76rem', lineHeight: 1.6 }}>
            This portal isn't available on iOS browsers.
            Use a{' '}
            <strong style={{ color: 'rgba(255,255,255,.8)' }}>MacBook, Windows, or any laptop</strong>
            {' '}to access the CRM.
          </div>
        </div>
      )}

      <p style={{
        color: 'rgba(255,255,255,.15)', fontSize: '.68rem',
        marginTop: 28, zIndex: 1,
      }}>
        © {new Date().getFullYear()} VigorLaunchpad · Internal use only
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

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
