import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';



export default function Login() {
  const { login, showToast } = useApp();
  const nav = useNavigate();
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password flow
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const s = login(email, password);
    setLoading(false);
    if (!s) {
      setError('Incorrect email or password. Click below to fill demo credentials.');
      return;
    }
    showToast(`Welcome back, ${s.name}!`, 'success');
    nav('/');
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your work email.');
      return;
    }
    setForgotLoading(true);

    try {
      const resp = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setForgotError(data.error || 'Something went wrong. Please try again.');
      } else {
        setForgotSuccess(data.message || 'If an account exists with this email, a password reset link has been sent.');
      }
    } catch (err) {
      console.warn('[ForgotPassword] API unavailable:', err.message);
      setForgotError('Unable to process request. Please contact your admin directly.');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-logo-card">
          <img
            src="/vigor-logo-new-01.png"
            alt="VigorLaunchpad"
            style={{ height: '36px', width: 'auto', display: 'block' }}
          />
        </div>

        <div className="login-hero">
          <h1>One portal for every <em>campaign</em> that matters.</h1>
          <p>Manage college activations, vendor networks, influencer pipelines, team tasks and campaign finances — all in a single, intelligent workspace.</p>
        </div>

        <div className="login-features">
          {[
            'Zone-based VigorSpace: North, South, East, West, Central',
            '500+ college contact database with fest schedules',
            'Influencer tier classification & AI bulk import',
            'Full campaign P&L with reimbursement workflows',
            'Role-based access — your data stays protected',
          ].map(f => (
            <div key={f} className="login-feat"><div className="login-feat-dot"/>{f}</div>
          ))}
        </div>

        <div className="login-footer">© {new Date().getFullYear()} VigorLaunchpad. Internal use only.</div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-box">
          
          {mode === 'login' ? (
            <>
              <div className="login-greeting">
                <h2>Sign in</h2>
                <p>Access your VigorLaunchpad workspace</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@vigorlaunchpad.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Password</label>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setMode('forgot');
                        setForgotEmail(email);
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                      style={{ fontSize: '0.75rem', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', padding: '0 0 4px 0' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: 4, display: 'flex',
                        alignItems: 'center', lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)', fontSize: '0.8rem', marginTop: 10 }}>
                    <AlertCircle size={14}/>
                    {error}
                  </div>
                )}

                <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="login-greeting">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0, marginBottom: 12, fontSize: '0.8rem', fontWeight: 500 }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
                <h2>Forgot password</h2>
                <p>Recover your VigorLaunchpad CRM access credentials</p>
              </div>

              <form onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@vigorlaunchpad.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {forgotError && (
                  <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)', fontSize: '0.8rem', marginTop: 10, background: '#fef2f2', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                    <AlertCircle size={14}/>
                    {forgotError}
                  </div>
                )}

                {forgotSuccess && (
                  <div className="login-success" style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#15803d', fontSize: '0.8rem', marginTop: 10, background: '#f0fdf4', padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1px solid #b9f6ca', lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <span>✓ Reset Instructions Ready</span>
                    </div>
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                <button className="login-btn" type="submit" disabled={forgotLoading} style={{ marginTop: 16 }}>
                  {forgotLoading ? 'Checking…' : 'Recover Password →'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
