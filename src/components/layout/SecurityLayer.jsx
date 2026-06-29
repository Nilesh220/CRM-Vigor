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
    function onBlur() {
      // Small delay so normal browser UI interactions don't trigger it
      timeoutRef.current = setTimeout(() => setBlurred(true), 150);
    }
    function onFocus() {
      clearTimeout(timeoutRef.current);
      setBlurred(false);
    }
    function onVisibilityChange() {
      if (document.hidden) {
        timeoutRef.current = setTimeout(() => setBlurred(true), 150);
      } else {
        clearTimeout(timeoutRef.current);
        setBlurred(false);
      }
    }

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(timeoutRef.current);
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
              left: `${(i % 5) * 22 - 5}%`,
              top: `${Math.floor(i / 5) * 22 - 5}%`,
              transform: 'rotate(-30deg)',
              fontSize: '.7rem',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.045)',
              whiteSpace: 'nowrap',
              letterSpacing: '.04em',
              fontFamily: 'monospace',
              lineHeight: 1.6,
            }}
          >
            <div>VIGOR CONFIDENTIAL</div>
            <div style={{ fontSize: '.62rem', fontWeight: 400 }}>{userName}</div>
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
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: 'rgba(15,23,42,0.55)',
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
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20,
            padding: '32px 40px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            color: '#fff',
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
            }}>
              Click anywhere to continue
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div
        style={{
          filter: blurred ? 'blur(20px)' : 'none',
          transition: 'filter 0.1s',
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
