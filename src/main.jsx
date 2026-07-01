import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* ══════════════════════════════════════════════════════════════
   SECURITY LAYER — Keyboard & clipboard protection
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;

  // Block PrintScreen (clear clipboard immediately)
  if (e.key === 'PrintScreen' || e.key === 'ScreenShot') {
    e.preventDefault();
    navigator.clipboard?.writeText('').catch(() => {});
    return;
  }

  // Block Ctrl/Meta + C (copy)
  if (ctrl && e.key === 'c') {
    const sel = window.getSelection()?.toString();
    // Only block if something is selected — allow empty ctrl+c
    if (sel && sel.trim().length > 0) {
      e.preventDefault();
      return;
    }
  }

  // Block Ctrl/Meta + A (select all)
  if (ctrl && e.key === 'a') {
    // Allow in input/textarea fields
    const tag = document.activeElement?.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      return;
    }
  }

  // Block Ctrl/Meta + P (print)
  if (ctrl && e.key === 'p') {
    e.preventDefault();
    return;
  }

  // Block Ctrl/Meta + S (save page)
  if (ctrl && e.key === 's') {
    e.preventDefault();
    return;
  }

  // Block F12 (devtools) — best-effort
  if (e.key === 'F12') {
    e.preventDefault();
    return;
  }

  // Block Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U (devtools / source)
  if (ctrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
    e.preventDefault();
    return;
  }
  if (ctrl && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault();
    return;
  }
});

// Block ALL right-click context menus app-wide
document.addEventListener('contextmenu', e => {
  e.preventDefault();
});

// Clear clipboard if user somehow copies
document.addEventListener('copy', e => {
  e.clipboardData?.setData('text/plain', '');
  e.preventDefault();
});

// Block drag-select + drag-copy
document.addEventListener('dragstart', e => {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
});

/* ══════════════════════════════════════════════════════════════
   MOBILE SCREENSHOT / SCREEN-RECORD PROTECTION
   When the page goes to background (OS screenshot gesture, app-
   switcher, notification shade) → instantly show a black overlay
   so the content doesn't leak into the screenshot thumbnail.
   This matches the behavior of banking apps, Jio Cinema, etc.
   ══════════════════════════════════════════════════════════════ */
(function () {
  // Create a full-screen black shield element
  const shield = document.createElement('div');
  shield.id = 'vl-screenshot-shield';
  Object.assign(shield.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647', // max z-index
    background: '#000000',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px',
  });
  // VigorLaunchpad lock icon inside the shield
  shield.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" opacity="0.4">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <span style="color:rgba(255,255,255,0.3);font-size:12px;font-family:sans-serif;letter-spacing:.05em">VigorLaunchpad — Secured</span>
  `;
  document.documentElement.appendChild(shield);

  function showShield() {
    shield.style.display = 'flex';
  }
  function hideShield() {
    shield.style.display = 'none';
  }

  // On visibility change (tab switch, screenshot gesture, app switcher)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      showShield();
    } else {
      // Small delay so the shield is still up during the screenshot capture
      setTimeout(hideShield, 300);
    }
  });

  // iOS Safari pagehide
  window.addEventListener('pagehide', showShield);
  window.addEventListener('pageshow', () => setTimeout(hideShield, 300));

  // Android Chrome blur
  window.addEventListener('blur', showShield);
  window.addEventListener('focus', () => setTimeout(hideShield, 300));
})();

/* ══════════════════════════════════════════════════════════════ */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
