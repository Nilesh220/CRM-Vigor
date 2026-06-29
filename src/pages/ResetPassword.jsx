import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength
  const getStrength = (pw) => {
    if (!pw) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', percent: 20 };
    if (score <= 2) return { label: 'Fair', color: '#f59e0b', percent: 40 };
    if (score <= 3) return { label: 'Good', color: '#3b82f6', percent: 60 };
    if (score <= 4) return { label: 'Strong', color: '#10b981', percent: 80 };
    return { label: 'Very Strong', color: '#059669', percent: 100 };
  };

  const strength = getStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset from the login page.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-right" style={{ flex: 1, maxWidth: 480, margin: '0 auto' }}>
          <div className="login-form-box" style={{ textAlign: 'center' }}>
            <AlertCircle size={48} color="var(--error)" style={{ marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8, fontSize: '1.25rem' }}>Invalid Reset Link</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '.85rem', marginBottom: 20 }}>
              This password reset link is invalid or has been used already.
            </p>
            <button className="login-btn" onClick={() => nav('/login')}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
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
          <h1>Set a new <em>password</em></h1>
          <p>Your account security matters. Choose a strong password that you don't use elsewhere.</p>
        </div>
        <div className="login-features">
          {[
            'Use at least 6 characters',
            'Include uppercase and lowercase letters',
            'Add numbers and special characters',
            'Do not reuse passwords from other sites',
          ].map(f => (
            <div key={f} className="login-feat"><div className="login-feat-dot" />{f}</div>
          ))}
        </div>
        <div className="login-footer">© {new Date().getFullYear()} VigorLaunchpad. Internal use only.</div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-box">
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#d1fae5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <CheckCircle size={32} color="#059669" />
              </div>
              <h2 style={{ marginBottom: 8, fontSize: '1.25rem', color: '#111827' }}>Password Reset Complete!</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '.85rem', marginBottom: 24, lineHeight: 1.5 }}>
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <button className="login-btn" onClick={() => nav('/login')} style={{ maxWidth: 280, margin: '0 auto' }}>
                Sign In with New Password →
              </button>
            </div>
          ) : (
            <>
              <div className="login-greeting">
                <button
                  type="button"
                  onClick={() => nav('/login')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0, marginBottom: 12, fontSize: '0.8rem', fontWeight: 500 }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
                <h2><Lock size={20} style={{ marginRight: 6, verticalAlign: 'middle' }} />Set New Password</h2>
                <p>Create a new password for your VigorLaunchpad account</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: '40px' }}
                      required
                      autoFocus
                      minLength={6}
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
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {password && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            style={{
                              flex: 1, height: 3, borderRadius: 2,
                              background: strength.percent >= i * 20 ? strength.color : '#e5e7eb',
                              transition: 'all .2s'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: '.7rem', color: strength.color, fontWeight: 600 }}>
                        {strength.label}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      style={{ paddingRight: '40px' }}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: 4, display: 'flex',
                        alignItems: 'center', lineHeight: 1,
                      }}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPw && password !== confirmPw && (
                    <div style={{ fontSize: '.72rem', color: 'var(--error)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> Passwords do not match
                    </div>
                  )}
                  {confirmPw && password === confirmPw && confirmPw.length >= 6 && (
                    <div style={{ fontSize: '.72rem', color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={11} /> Passwords match
                    </div>
                  )}
                </div>

                {error && (
                  <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)', fontSize: '0.8rem', marginTop: 10, background: '#fef2f2', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  className="login-btn"
                  type="submit"
                  disabled={loading || password.length < 6 || password !== confirmPw}
                  style={{ marginTop: 16 }}
                >
                  {loading ? <><Loader2 size={14} className="spinner" style={{ marginRight: 6 }} />Resetting…</> : 'Reset Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
