import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Users } from 'lucide-react';

const TEAMS = [
  { value: 'VigorSpace Team', label: 'VigorSpace Team' },
  { value: 'Influencer Team', label: 'Influencer Team' },
  { value: 'Digital Team', label: 'Digital Team' },
  { value: 'Operations Team', label: 'Operations Team' },
  { value: 'Finance Team', label: 'Finance Team' },
  { value: 'HR Team', label: 'HR Team' },
];

/**
 * MultiAssignSelect
 * Props:
 *   value      – array of selected IDs/team strings
 *   onChange   – (newArray) => void
 *   users      – array of user objects from getAllUsers()
 *   placeholder – string
 */
export default function MultiAssignSelect({ value = [], onChange, users = [], placeholder = 'Select teams or members…' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Normalize value to always be an array
  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function remove(id) {
    onChange(selected.filter(s => s !== id));
  }

  function getLabel(id) {
    const team = TEAMS.find(t => t.value === id);
    if (team) return team.label;
    const user = users.find(u => u.id === id);
    return user ? user.name : id;
  }

  function getInitials(id) {
    const label = getLabel(id);
    return label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const filteredTeams = search
    ? TEAMS.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : TEAMS;

  const filteredUsers = search
    ? users.filter(u => `${u.name} ${u.dept || ''}`.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger box */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: 5, minHeight: 38, padding: '4px 36px 4px 10px',
          border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)',
          background: 'var(--surface)', cursor: 'pointer', position: 'relative',
          transition: 'border-color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {selected.length === 0 && (
          <span style={{ color: 'var(--text-3)', fontSize: '.82rem' }}>{placeholder}</span>
        )}
        {selected.map(id => (
          <span key={id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'var(--primary-hover)', color: 'var(--primary)',
            border: '1px solid var(--primary)', borderRadius: '99px',
            fontSize: '.72rem', fontWeight: 600, padding: '2px 8px 2px 6px',
          }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--primary)', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.58rem', fontWeight: 700, flexShrink: 0,
            }}>{getInitials(id)}</span>
            {getLabel(id)}
            <button
              onClick={e => { e.stopPropagation(); remove(id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--primary)', opacity: .7, lineHeight: 1 }}
            ><X size={10} /></button>
          </span>
        ))}
        <ChevronDown size={14} style={{
          position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          color: 'var(--text-3)', transition: 'transform .15s', pointerEvents: 'none',
        }} />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000,
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-sm)', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          maxHeight: 280, display: 'flex', flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              className="input"
              placeholder="Search teams or members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ padding: '5px 10px', fontSize: '.8rem' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Teams group */}
            {filteredTeams.length > 0 && (
              <>
                <div style={{ padding: '6px 12px 2px', fontSize: '.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Teams</div>
                {filteredTeams.map(t => {
                  const isSelected = selected.includes(t.value);
                  return (
                    <div key={t.value}
                      onClick={() => toggle(t.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 12px', cursor: 'pointer', fontSize: '.82rem',
                        background: isSelected ? 'var(--primary-hover)' : 'transparent',
                        color: isSelected ? 'var(--primary)' : 'var(--text)',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background .1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                      <Users size={12} style={{ flexShrink: 0 }} />
                      {t.label}
                    </div>
                  );
                })}
              </>
            )}
            {/* Members group */}
            {filteredUsers.length > 0 && (
              <>
                <div style={{ padding: '6px 12px 2px', fontSize: '.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Members</div>
                {filteredUsers.map(u => {
                  const isSelected = selected.includes(u.id);
                  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id}
                      onClick={() => toggle(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 12px', cursor: 'pointer', fontSize: '.82rem',
                        background: isSelected ? 'var(--primary-hover)' : 'transparent',
                        color: isSelected ? 'var(--primary)' : 'var(--text)',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background .1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
                      }}>{initials}</div>
                      <span style={{ flex: 1 }}>{u.name}</span>
                      {u.dept && <span style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{u.dept}</span>}
                    </div>
                  );
                })}
              </>
            )}
            {filteredTeams.length === 0 && filteredUsers.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '.8rem' }}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
