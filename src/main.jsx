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


/* ══════════════════════════════════════════════════════════════ */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
