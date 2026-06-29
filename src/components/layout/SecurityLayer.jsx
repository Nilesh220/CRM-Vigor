import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useSession } from '../../contexts/AppContext';

/**
 * SecurityLayer
 * ─────────────
 * 1. Blurs the entire app when the window/tab loses focus
 *    (defeats Snipping Tool, Win+Shift+S, Alt+Tab screenshots)
 * 2. Shows a persistent watermark with the logged-in user's name
 *    (traceable even if a photo of the screen is taken)
 * 3. Shows a full-screen "protected" message when blurred
 */
export default function SecurityLayer() {
  const session = useSession();
  const [blurred, setBlurred] = useState(false);
  const timeoutRef = useRef(null);

  // ── Blur on window/tab focus loss ──────────────────────────
  useEffect(() => {
    function triggerProtect() {
      setBlurred(true);
      navigator.clipboard?.writeText('').catch(() => {});
    }

    function onBlur() {
      triggerProtect();
    }
    function onFocus() {
      // Keep blurred state until explicit click to ensure they don't snapshot on rapid toggle
    }
    function onVisibilityChange() {
      if (document.hidden) {
        triggerProtect();
      }
    }

    // Capture Windows+Shift+S, PrintScreen, or Command+Shift+S key combos
    function onKeyDown(e) {
      const isMeta = e.key === 'Meta' || e.key === 'OS' || e.keyCode === 91 || e.keyCode === 92;
      const isShiftS = (e.key === 's' || e.key === 'S') && e.shiftKey && (e.metaKey || e.ctrlKey);
      const isPrintScreen = e.key === 'PrintScreen' || e.key === 'ScreenShot' || e.keyCode === 44;

      if (isMeta || isShiftS || isPrintScreen) {
        triggerProtect();
        // Repeatedly wipe clipboard to overwrite any system-captured screenshot
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            navigator.clipboard?.writeText('CONFIDENTIAL CONTENT - COPY RESTRICTED').catch(() => {});
          }, i * 100);
        }
      }
    }

    function onKeyUp(e) {
      const isPrintScreen = e.key === 'PrintScreen' || e.key === 'ScreenShot' || e.keyCode === 44;
      if (isPrintScreen) {
        triggerProtect();
        navigator.clipboard?.writeText('CONFIDENTIAL CONTENT - COPY RESTRICTED').catch(() => {});
      }
    }

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const userName = session?.name || session?.email || 'VigorLaunchpad User';
  const userEmail = session?.email || '';
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      {/* ── Watermark overlay (always visible, pointer-events none) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Diagonal repeating watermark */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i % 5) * 22 - 3}%`,
              top: `${Math.floor(i / 5) * 22 - 3}%`,
              transform: 'rotate(-25deg)',
              fontSize: '.75rem',
              fontWeight: 800,
              color: 'rgba(15,23,42,0.035)', // Faint, non-intrusive trace watermark
              whiteSpace: 'nowrap',
              letterSpacing: '.05em',
              fontFamily: 'monospace',
              lineHeight: 1.6,
            }}
          >
            <div>VIGOR LAUNCHPAD CONFIDENTIAL</div>
            <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'rgba(15,23,42,0.045)' }}>{userName}</div>
            {userEmail && <div style={{ fontSize: '.60rem', fontWeight: 400, opacity: .9 }}>{userEmail}</div>}
            <div style={{ fontSize: '.58rem', fontWeight: 400, opacity: .8 }}>{now}</div>
          </div>
        ))}
      </div>

      {/* ── Blur shield when window is not focused ── */}
      {blurred && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#090d16', // Solid opaque dark color so absolutely no content shines through
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            userSelect: 'none',
            cursor: 'default',
          }}
          onClick={() => setBlurred(false)}
        >
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '32px 40px',
            textAlign: 'center',
            color: '#fff',
            maxWidth: '90%',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>
              Screen Protected
            </div>
            <div style={{ fontSize: '.82rem', opacity: .75, marginBottom: 20 }}>
              Content is hidden while the window is not in focus.
            </div>
            <div style={{
              fontSize: '.72rem',
              opacity: .5,
              padding: '6px 14px',
              background: 'rgba(255,255,255,.08)',
              borderRadius: 99,
              display: 'inline-block',
              cursor: 'pointer',
            }}>
              Click anywhere to resume
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div
        style={{
          visibility: blurred ? 'hidden' : 'visible',
          opacity: blurred ? 0 : 1,
          transition: 'opacity 0.08s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onContextMenu={e => e.preventDefault()}
        onCopy={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
      >
        <Outlet />
      </div>
    </div>
  );
}
