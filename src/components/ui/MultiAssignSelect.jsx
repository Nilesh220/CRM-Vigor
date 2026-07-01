import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Users, Check } from 'lucide-react';

const TEAMS = [
  { value: 'VigorSpace Team', label: 'VigorSpace Team' },
  { value: 'Influencer Team', label: 'Influencer Team' },
  { value: 'Digital Team', label: 'Digital Team' },
  { value: 'Operations Team', label: 'Operations Team' },
  { value: 'Finance Team', label: 'Finance Team' },
  { value: 'HR Team', label: 'HR Team' },
];

const AVATAR_COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];

/**
 * MultiAssignSelect — multi-select picker for teams + members.
 * Props:
 *   value      – array of selected IDs/team strings
 *   onChange   – (newArray) => void
 *   users      – array of user objects from getAllUsers()
 *   placeholder – string
 */
export default function MultiAssignSelect({ value = [], onChange, users = [], placeholder = 'Click to assign people…' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function toggle(id) {
    const next = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    onChange(next);
    // Keep dropdown open — user can pick more!
  }

  function remove(e, id) {
    e.stopPropagation();
    onChange(selected.filter(s => s !== id));
  }

  function getLabel(id) {
    const team = TEAMS.find(t => t.value === id);
    if (team) return team.label;
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  }

  function getInitials(label) {
    return label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function getColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[Math.abs(h)];
  }

  const q = search.toLowerCase();
  const filteredTeams = TEAMS.filter(t => !q || t.label.toLowerCase().includes(q));
  const filteredUsers = users.filter(u => !q || `${u.name} ${u.dept || ''}`.toLowerCase().includes(q));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Trigger ─────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6,
          minHeight: 42, padding: selected.length ? '6px 36px 6px 8px' : '0 36px 0 12px',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--r-sm)', background: 'var(--surface)',
          cursor: 'pointer', position: 'relative',
          boxShadow: open ? '0 0 0 3px var(--primary-hover)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          alignContent: 'center',
        }}
      >
        {/* Chips for selected */}
        {selected.length === 0 && (
          <span style={{ color: 'var(--text-3)', fontSize: '.82rem', lineHeight: '42px' }}>{placeholder}</span>
        )}
        {selected.map(id => {
          const label = getLabel(id);
          const color = getColor(id);
          return (
            <span key={id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: color + '18', color, border: `1px solid ${color}44`,
              borderRadius: '99px', fontSize: '.73rem', fontWeight: 700,
              padding: '3px 8px 3px 5px', lineHeight: 1,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: color,
                color: '#fff', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '.58rem', fontWeight: 800, flexShrink: 0,
              }}>{getInitials(label)}</span>
              {label}
              <button
                onMouseDown={e => { e.stopPropagation(); }}
                onClick={e => remove(e, id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', display: 'flex', alignItems: 'center', color, opacity: .6 }}
              ><X size={10} strokeWidth={2.5} /></button>
            </span>
          );
        })}

        {/* Badge showing count + chevron */}
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {selected.length > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff', borderRadius: '99px',
              fontSize: '.62rem', fontWeight: 800, padding: '1px 7px',
            }}>{selected.length}</span>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-3)', transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .15s' }} />
        </div>
      </div>

      {/* Multi-select hint */}
      {selected.length === 0 && !open && (
        <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: 3 }}>
          You can assign to multiple people — click to open and pick as many as needed
        </div>
      )}

      {/* ── Dropdown ─────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000,
          background: '#ffffff',
          border: '1.5px solid var(--primary)',
          borderRadius: 'var(--r-sm)', boxShadow: '0 12px 30px rgba(0,0,0,.18)',
          maxHeight: 300, display: 'flex', flexDirection: 'column',
          isolation: 'isolate',
        }}>
          {/* Header row */}
          <div style={{
            padding: '8px 12px 6px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--primary)' }}>
              ✓ Select multiple — click any to add/remove
            </span>
            {selected.length > 0 && (
              <button onClick={() => onChange([])} style={{
                fontSize: '.68rem', color: 'var(--text-3)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>Clear all</button>
            )}
          </div>

          {/* Search */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              className="input"
              placeholder="Search teams or members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              style={{ padding: '5px 10px', fontSize: '.8rem', width: '100%' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Teams */}
            {filteredTeams.length > 0 && (
              <>
                <div style={{ padding: '6px 12px 2px', fontSize: '.67rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Teams
                </div>
                {filteredTeams.map(t => {
                  const isSel = selected.includes(t.value);
                  const color = getColor(t.value);
                  return (
                    <div key={t.value}
                      onClick={() => toggle(t.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', cursor: 'pointer', fontSize: '.82rem',
                        background: isSel ? color + '12' : 'transparent',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        border: `2px solid ${isSel ? color : 'var(--border)'}`,
                        background: isSel ? color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all .12s',
                      }}>
                        {isSel && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <Users size={13} style={{ color: isSel ? color : 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontWeight: isSel ? 700 : 400, color: isSel ? color : 'var(--text)' }}>
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* Members */}
            {filteredUsers.length > 0 && (
              <>
                <div style={{ padding: '6px 12px 2px', fontSize: '.67rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', borderTop: filteredTeams.length ? '1px solid var(--border)' : 'none', marginTop: filteredTeams.length ? 4 : 0 }}>
                  Members
                </div>
                {filteredUsers.map(u => {
                  const isSel = selected.includes(u.id);
                  const color = getColor(u.id);
                  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id}
                      onClick={() => toggle(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', cursor: 'pointer', fontSize: '.82rem',
                        background: isSel ? color + '12' : 'transparent',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        border: `2px solid ${isSel ? color : 'var(--border)'}`,
                        background: isSel ? color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all .12s',
                      }}>
                        {isSel && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      {/* Avatar */}
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', background: color,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.65rem', fontWeight: 800, flexShrink: 0,
                      }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: isSel ? 700 : 400, color: isSel ? color : 'var(--text)' }}>{u.name}</div>
                        {u.dept && <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{u.dept}</div>}
                      </div>
                      {isSel && (
                        <span style={{ fontSize: '.68rem', fontWeight: 700, color, background: color + '18', padding: '1px 7px', borderRadius: '99px' }}>
                          ✓ Added
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {filteredTeams.length === 0 && filteredUsers.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '.8rem' }}>
                No results found
              </div>
            )}
          </div>

          {/* Footer: done button */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
              {selected.length > 0 ? `${selected.length} assigned` : 'None selected'}
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--r-sm)', padding: '5px 14px',
                fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
              }}
            >Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
