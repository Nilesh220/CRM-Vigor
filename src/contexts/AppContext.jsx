import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, setSession, clearSession, getAllUsers, initDemoData, syncUsersFromDB } from '../lib/data';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      // Restore session from cache immediately
      const s = getSession();
      if (s) setSessionState(s);

      // Seed Supabase + sync all data (non-blocking for UI)
      try {
        await initDemoData();
        // Re-sync users in case Supabase has newer data
        await syncUsersFromDB();
      } catch (err) {
        console.warn('[AppContext] Supabase sync failed, using localStorage fallback:', err.message);
      }

      setReady(true);
    }
    bootstrap();
  }, []);

  const login = useCallback((email, password) => {
    const users = getAllUsers();
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) return null;
    const s = { ...u }; delete s.password;
    setSession(s);
    setSessionState(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const showToast = useCallback((msg, type = 'default', dur = 3500) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), dur);
  }, []);

  return (
    <AppCtx.Provider value={{ session, login, logout, showToast, ready }}>
      {children}
      <ToastStack toasts={toasts} />
    </AppCtx.Provider>
  );
}

export function useApp()     { return useContext(AppCtx); }
export function useSession() { return useContext(AppCtx).session; }
export function useToast()   { return useContext(AppCtx).showToast; }

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  const icons = {
    success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    error:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    default: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>,
  };
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {icons[t.type] || icons.default}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
