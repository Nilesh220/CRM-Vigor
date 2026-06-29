import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// P7 — Deter screenshots & copy (keyboard layer)
document.addEventListener('keydown', e => {
  // Block PrintScreen
  if (e.key === 'PrintScreen') {
    e.preventDefault();
    navigator.clipboard?.writeText('');
  }
  // Block Ctrl+P (print)
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
  }
});
// P7 — Disable right-click context menu on data areas (tables)
document.addEventListener('contextmenu', e => {
  if (e.target.closest('table, .data-table, .kpi-card, .card')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
