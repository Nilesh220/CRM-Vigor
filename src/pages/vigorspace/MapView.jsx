import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollegeDB, ZONES, genId, logActivity } from '../../lib/data';
import { useToast, useSession } from '../../contexts/AppContext';
import {
  MapPin, School, Plus, ChevronRight, ChevronLeft,
  X, Search, Building2, ExternalLink, Globe,
  GraduationCap, Navigation, Layers, TrendingUp
} from 'lucide-react';

/* ── constants ─────────────────────────────────────────────── */
const LS_CITIES = 'vl_map_custom_cities';
const LS_STATES = 'vl_map_custom_states';

const ZONE_META = {
  north: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
    glow: '#3b82f6',
    pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    emoji: '🏔️',
  },
  south: {
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)',
    glow: '#10b981',
    pattern: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    emoji: '🌴',
  },
  east: {
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%)',
    glow: '#f59e0b',
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='72' viewBox='0 0 36 72'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M2 6h12L8 18 2 6zm18 36h12l-6 12-6-12z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    emoji: '🌊',
  },
  west: {
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #8b5cf6 100%)',
    glow: '#8b5cf6',
    pattern: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    emoji: '🏖️',
  },
  central: {
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ef4444 100%)',
    glow: '#ef4444',
    pattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
    emoji: '🌾',
  },
};

/* ── main component ────────────────────────────────────────── */
export default function MapView() {
  const toast   = useToast();
  const session = useSession();
  const navigate = useNavigate();
  const canEdit = ['admin','founder','operations','vigorspace'].includes(session?.role);

  const [colleges,    setColleges]    = useState(() => CollegeDB.all());
  const [selZone,     setSelZone]     = useState(null);
  const [selState,    setSelState]    = useState(null);
  const [selCity,     setSelCity]     = useState(null);
  const [search,      setSearch]      = useState('');
  const [customCities, setCustomCities] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_CITIES) || '{}'); } catch { return {}; }
  });
  const [customStates, setCustomStates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_STATES) || '{}'); } catch { return {}; }
  });
  const [addCityModal,    setAddCityModal]    = useState(false);
  const [addStateModal,   setAddStateModal]   = useState(false);
  const [addCollegeModal, setAddCollegeModal] = useState(false);
  const [newCityName,     setNewCityName]     = useState('');
  const [newStateName,    setNewStateName]    = useState('');
  const [newCollegeName,  setNewCollegeName]  = useState('');

  useEffect(() => { CollegeDB.syncFromDB().then(r => setColleges(r)); }, []);

  const level     = selCity ? 4 : selState ? 3 : selZone ? 2 : 1;
  const zoneData  = selZone ? ZONES[selZone] : null;
  const zoneMeta  = selZone ? ZONE_META[selZone] : null;
  const zoneColor = zoneData?.color ?? '#6b7280';

  /* ── data helpers ─── */
  const collegesInZone  = zk => colleges.filter(c => c.zone === zk);
  const collegesInState = st => colleges.filter(c => c.zone === selZone && c.state === st);
  const collegesInCity  = ct => colleges.filter(c => c.zone === selZone && c.state === selState && c.city === ct);
  const citiesForState  = st => {
    const fromDB = colleges.filter(c => c.zone === selZone && c.state === st).map(c => c.city).filter(Boolean);
    return [...new Set([...fromDB, ...(customCities[st] || [])])].sort();
  };

  /* ── add handlers ─── */
  function handleAddCity() {
    const name = newCityName.trim();
    if (!name) { toast('Enter a city name', 'warning'); return; }
    if (citiesForState(selState).includes(name)) { toast('City already exists', 'info'); return; }
    const updated = { ...customCities, [selState]: [...(customCities[selState] || []), name] };
    setCustomCities(updated); localStorage.setItem(LS_CITIES, JSON.stringify(updated));
    setNewCityName(''); setAddCityModal(false); toast(`${name} added!`, 'success');
  }
  async function handleAddCollege() {
    const name = newCollegeName.trim();
    if (!name) { toast('Enter college name', 'warning'); return; }
    const payload = { id: genId('col'), name, state: selState, city: selCity, zone: selZone, status: 'Active', contacts: [], createdBy: session?.id, createdAt: new Date().toISOString() };
    await CollegeDB.add(payload);
    logActivity('Added', 'College', name, `${selCity}, ${selState}`);
    setColleges(CollegeDB.all()); setNewCollegeName(''); setAddCollegeModal(false); toast(`${name} added!`, 'success');
  }
  function handleAddState() {
    const name = newStateName.trim();
    if (!name || !selZone) { toast('Enter a state name', 'warning'); return; }
    const baseStates = ZONES[selZone]?.states || [];
    const addedStates = customStates[selZone] || [];
    const existing = [...new Set([...baseStates, ...addedStates])];
    if (existing.includes(name)) { toast('State already exists', 'info'); return; }
    const updated = { ...customStates, [selZone]: [...addedStates, name] };
    setCustomStates(updated);
    localStorage.setItem(LS_STATES, JSON.stringify(updated));
    setNewStateName('');
    setAddStateModal(false);
    toast(`${name} added to ${ZONES[selZone].label}!`, 'success');
  }
  function goBack() {
    setSearch('');
    if (level === 4) setSelCity(null);
    else if (level === 3) setSelState(null);
    else if (level === 2) setSelZone(null);
  }

  const baseStates = selZone ? ZONES[selZone].states : [];
  const addedStates = selZone ? (customStates[selZone] || []) : [];
  const allStatesInZone = [...new Set([...baseStates, ...addedStates])].sort();
  const statesInZone = selZone ? allStatesInZone.filter(s => !search || s.toLowerCase().includes(search.toLowerCase())) : [];
  const cities = selState ? citiesForState(selState).filter(c => !search || c.toLowerCase().includes(search.toLowerCase())) : [];
  const cityColleges = selCity ? collegesInCity(selCity) : [];
  const totalColleges = colleges.length;
  const totalStates   = Object.values(ZONES).flatMap(z => z.states).length + Object.values(customStates).flat().length;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="page-body" style={{ paddingBottom: 60 }}>

      {/* ── BREADCRUMB ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px', fontSize: '.78rem' }}>
          <Globe size={12} color="var(--primary)" />
          <span style={{ cursor: level > 1 ? 'pointer' : 'default', color: level > 1 ? 'var(--primary)' : 'var(--text)', fontWeight: 600 }}
            onClick={() => { setSelZone(null); setSelState(null); setSelCity(null); setSearch(''); }}>
            India
          </span>
          {selZone && <>
            <ChevronRight size={11} color="var(--text-3)" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: zoneColor, display: 'inline-block' }} />
              <span style={{ cursor: level > 2 ? 'pointer' : 'default', color: level > 2 ? 'var(--primary)' : 'var(--text)', fontWeight: 600 }}
                onClick={() => { setSelState(null); setSelCity(null); setSearch(''); }}>{zoneData?.label}</span>
            </span>
          </>}
          {selState && <>
            <ChevronRight size={11} color="var(--text-3)" />
            <span style={{ cursor: level > 3 ? 'pointer' : 'default', color: level > 3 ? 'var(--primary)' : 'var(--text)', fontWeight: 600 }}
              onClick={() => { setSelCity(null); setSearch(''); }}>{selState}</span>
          </>}
          {selCity && <>
            <ChevronRight size={11} color="var(--text-3)" />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selCity}</span>
          </>}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LEVEL 1 — ZONES                                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {level === 1 && (
        <>
          {/* Hero Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { icon: Layers, label: 'Zones', value: Object.keys(ZONES).length, color: '#6366f1' },
              { icon: MapPin, label: 'States', value: totalStates, color: '#0ea5e9' },
              { icon: Building2, label: 'Cities', value: Object.values(ZONES).flatMap(z => z.states).reduce((acc, st) => acc + [...new Set(colleges.filter(c => c.state === st).map(c => c.city).filter(Boolean))].length, 0), color: '#f59e0b' },
              { icon: GraduationCap, label: 'Colleges', value: totalColleges, color: '#10b981' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={17} color={s.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Zone Title */}
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 3 }}>Explore by Zone</h2>
            <p style={{ fontSize: '.8rem', color: 'var(--text-3)', margin: 0 }}>Click any zone card to drill into states, cities &amp; colleges</p>
          </div>

          {/* Zone Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 18 }}>
            {Object.values(ZONES).map(z => {
              const meta = ZONE_META[z.key];
              const zCols = collegesInZone(z.key).length;
              const zCities = [...new Set(collegesInZone(z.key).map(c => c.city).filter(Boolean))].length;
              const pct = totalColleges ? Math.round((zCols / totalColleges) * 100) : 0;
              return (
                <div key={z.key}
                  onClick={() => { setSelZone(z.key); setSearch(''); }}
                  className="zone-map-card"
                  style={{ background: meta.gradient, borderRadius: 20, padding: '24px 22px', cursor: 'pointer', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: `0 8px 32px ${meta.glow}30`, transition: 'transform .2s, box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 20px 48px ${meta.glow}50`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 32px ${meta.glow}30`; }}>
                  {/* BG pattern */}
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: meta.pattern, opacity: 1 }} />
                  {/* Glow orb */}
                  <div style={{ position: 'absolute', right: -20, bottom: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />

                  <div style={{ position: 'relative' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: '1.55rem', marginBottom: 4 }}>{meta.emoji}</div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-.01em' }}>{z.label}</div>
                        <div style={{ fontSize: '.72rem', opacity: .75, marginTop: 2 }}>{z.states.length} states</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '5px 10px', fontSize: '.7rem', fontWeight: 700, backdropFilter: 'blur(6px)' }}>
                        {pct}% share
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{zCols}</div>
                        <div style={{ fontSize: '.68rem', opacity: .75 }}>Colleges</div>
                      </div>
                      <div style={{ width: 1, background: 'rgba(255,255,255,.2)' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{zCities}</div>
                        <div style={{ fontSize: '.68rem', opacity: .75 }}>Cities</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,.85)', borderRadius: 99, transition: 'width .6s ease', minWidth: pct > 0 ? 6 : 0 }} />
                      </div>
                    </div>

                    {/* CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontWeight: 700, opacity: .9, background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '6px 12px', width: 'fit-content' }}>
                      Explore States <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LEVEL 2 — STATES                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {level === 2 && (
        <>
          {/* Zone hero banner */}
          <div style={{ background: zoneMeta?.gradient, borderRadius: 18, padding: '22px 24px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: `0 8px 32px ${zoneColor}30` }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: zoneMeta?.pattern }} />
            <div style={{ position: 'absolute', right: -10, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.07)', filter: 'blur(24px)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{zoneMeta?.emoji}</div>
                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 4px', letterSpacing: '-.01em' }}>{zoneData?.label}</h2>
                <div style={{ fontSize: '.78rem', opacity: .8 }}>{statesInZone.length} states &bull; {collegesInZone(selZone).length} colleges</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={goBack}
                  style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', backdropFilter: 'blur(6px)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '.82rem', fontWeight: 600 }}>
                  <ChevronLeft size={13} /> Back
                </button>
                {canEdit && (
                  <button className="btn" onClick={() => setAddStateModal(true)}
                    style={{ background: 'rgba(255,255,255,.3)', border: '1px solid rgba(255,255,255,.4)', color: '#fff', backdropFilter: 'blur(6px)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '.82rem', fontWeight: 600 }}>
                    <Plus size={13} /> Add State
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="search-wrap" style={{ maxWidth: 280, marginBottom: 18 }}>
            <Search size={13} /><input placeholder="Search states…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
          </div>

          {/* State grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {statesInZone.map(state => {
              const stCols   = collegesInState(state).length;
              const stCities = citiesForState(state).length;
              return (
                <div key={state}
                  onClick={() => { setSelState(state); setSearch(''); }}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '16px 16px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.boxShadow = `0 6px 24px ${zoneColor}25`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  {/* Color bar top */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${zoneColor}, ${zoneColor}80)` }} />
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{state}</div>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${zoneColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Navigation size={13} color={zoneColor} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 0 }}>
                      <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.3rem', color: zoneColor }}>{stCities}</div>
                        <div style={{ fontSize: '.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cities</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{stCols}</div>
                        <div style={{ fontSize: '.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Colleges</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: '.73rem', color: 'var(--text-3)', fontWeight: 600 }}>
                      View Cities <ChevronRight size={11} />
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Add State ghost card */}
            {canEdit && (
              <div onClick={() => setAddStateModal(true)}
                style={{ border: '2px dashed var(--border-2)', borderRadius: 16, padding: '16px 16px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 110, gap: 8, color: 'var(--text-3)', transition: 'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.color = zoneColor; e.currentTarget.style.background = `${zoneColor}08`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} />
                </div>
                <span style={{ fontSize: '.78rem', fontWeight: 600 }}>Add State</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LEVEL 3 — CITIES                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {level === 3 && (
        <>
          {/* State banner */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${zoneColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${zoneColor}30` }}>
                <MapPin size={20} color={zoneColor} />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 3px' }}>{selState}</h2>
                <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
                  <span style={{ color: zoneColor, fontWeight: 600 }}>{cities.length}</span> cities &bull;&nbsp;
                  <span style={{ fontWeight: 600 }}>{collegesInState(selState).length}</span> colleges
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={goBack}><ChevronLeft size={13} /> Back</button>
              {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setAddCityModal(true)}><Plus size={13} /> Add City</button>}
            </div>
          </div>

          <div className="search-wrap" style={{ maxWidth: 280, marginBottom: 18 }}>
            <Search size={13} /><input placeholder="Search cities…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
          </div>

          {cities.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <Building2 size={44} color="var(--border-2)" />
              <div className="empty-state-title">No cities in {selState} yet</div>
              <div className="empty-state-text">Cities appear automatically when you add colleges with this state &amp; city. Or add one manually.</div>
              {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setAddCityModal(true)}><Plus size={13} /> Add City</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
              {cities.map(city => {
                const count = collegesInCity(city).length;
                return (
                  <div key={city}
                    onClick={() => { setSelCity(city); setSearch(''); }}
                    style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '16px 14px', cursor: 'pointer', transition: 'all .18s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.boxShadow = `0 6px 20px ${zoneColor}22`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${zoneColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={15} color={zoneColor} />
                      </div>
                      <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: count > 0 ? `${zoneColor}18` : 'var(--bg)', color: count > 0 ? zoneColor : 'var(--text-3)', border: `1px solid ${count > 0 ? zoneColor + '30' : 'var(--border)'}` }}>
                        {count} {count === 1 ? 'college' : 'colleges'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 4 }}>{city}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <School size={11} /> {selState}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${zoneColor}, transparent)`, opacity: 0.5 }} />
                  </div>
                );
              })}
              {/* Add City ghost card */}
              {canEdit && (
                <div onClick={() => setAddCityModal(true)}
                  style={{ border: '2px dashed var(--border-2)', borderRadius: 14, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, gap: 8, color: 'var(--text-3)', transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.color = zoneColor; e.currentTarget.style.background = `${zoneColor}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                  </div>
                  <span style={{ fontSize: '.78rem', fontWeight: 600 }}>Add City</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LEVEL 4 — COLLEGES                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {level === 4 && (
        <>
          {/* City banner */}
          <div style={{ background: `linear-gradient(135deg, ${zoneColor}12, ${zoneColor}06)`, border: `1.5px solid ${zoneColor}28`, borderRadius: 16, padding: '18px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${zoneColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${zoneColor}40` }}>
                <GraduationCap size={22} color={zoneColor} />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 3px' }}>{selCity}</h2>
                <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
                  {selState} &bull; {zoneData?.label} &bull;&nbsp;
                  <span style={{ color: zoneColor, fontWeight: 700 }}>{cityColleges.length} college{cityColleges.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={goBack}><ChevronLeft size={13} /> Back</button>
              {canEdit && <>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/colleges')}><ExternalLink size={13} /> All Colleges</button>
                <button className="btn btn-primary btn-sm" onClick={() => setAddCollegeModal(true)}><Plus size={13} /> Add College</button>
              </>}
            </div>
          </div>

          {cityColleges.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <GraduationCap size={44} color="var(--border-2)" />
              <div className="empty-state-title">No colleges in {selCity} yet</div>
              <div className="empty-state-text">Add a college from the Colleges page with<br /><strong>zone={selZone}, state={selState}, city={selCity}</strong></div>
              {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setAddCollegeModal(true)}><Plus size={13} /> Quick Add</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
              {cityColleges.map(c => (
                <div key={c.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '18px', transition: 'all .18s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.boxShadow = `0 6px 24px ${zoneColor}20`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  {/* Top accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${zoneColor}, ${zoneColor}40)` }} />
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${zoneColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${zoneColor}25` }}>
                        <School size={18} color={zoneColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{c.affiliation || c.type || 'College'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                      {c.naacGrade && <span style={{ fontSize: '.66rem', padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe' }}>NAAC {c.naacGrade}</span>}
                      <span style={{ fontSize: '.66rem', padding: '2px 8px', borderRadius: 99, background: c.status === 'Active' ? '#f0fdf4' : '#f9fafb', color: c.status === 'Active' ? '#15803d' : '#6b7280', border: `1px solid ${c.status === 'Active' ? '#bbf7d0' : '#e5e7eb'}`, fontWeight: 600 }}>{c.status || 'Active'}</span>
                      {c.contacts?.length > 0 && <span style={{ fontSize: '.66rem', padding: '2px 8px', borderRadius: 99, background: 'var(--bg)', color: 'var(--text-3)', border: '1px solid var(--border)', fontWeight: 600 }}>{c.contacts.length} contact{c.contacts.length !== 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.website && (
                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '.74rem', fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', transition: 'all .15s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = zoneColor}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <ExternalLink size={11} /> Website
                        </a>
                      )}
                      <button onClick={() => navigate('/colleges')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', borderRadius: 9, background: `${zoneColor}14`, border: `1px solid ${zoneColor}30`, fontSize: '.74rem', fontWeight: 700, color: zoneColor, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = `${zoneColor}22`}
                        onMouseLeave={e => e.currentTarget.style.background = `${zoneColor}14`}>
                        Full View →
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add College ghost card */}
              {canEdit && (
                <div onClick={() => setAddCollegeModal(true)}
                  style={{ border: '2px dashed var(--border-2)', borderRadius: 16, padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, gap: 10, color: 'var(--text-3)', transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zoneColor; e.currentTarget.style.color = zoneColor; e.currentTarget.style.background = `${zoneColor}06`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 2 }}>Add College</div>
                    <div style={{ fontSize: '.7rem', opacity: .7 }}>to {selCity}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODALS                                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {addStateModal && (
        <div className="overlay" onClick={() => setAddStateModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><MapPin size={14} style={{ marginRight: 7 }} />Add State &mdash; {zoneData?.label}</span>
              <button className="modal-close" onClick={() => setAddStateModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">State Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Maharashtra" value={newStateName}
                  onChange={e => setNewStateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddState()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddStateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddState}>Add State</button>
            </div>
          </div>
        </div>
      )}

      {addCityModal && (
        <div className="overlay" onClick={() => setAddCityModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><Building2 size={14} style={{ marginRight: 7 }} />Add City &mdash; {selState}</span>
              <button className="modal-close" onClick={() => setAddCityModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">City Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Pune" value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCity()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddCityModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCity}>Add City</button>
            </div>
          </div>
        </div>
      )}

      {addCollegeModal && (
        <div className="overlay" onClick={() => setAddCollegeModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><GraduationCap size={14} style={{ marginRight: 7 }} />Add College &mdash; {selCity}</span>
              <button className="modal-close" onClick={() => setAddCollegeModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">College Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Savitribai Phule Pune University" value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCollege()} autoFocus />
              </div>
              <div style={{ marginTop: 12, padding: '12px 14px', background: `${zoneColor}0c`, border: `1px solid ${zoneColor}28`, borderRadius: 10, fontSize: '.78rem', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📍 Will be saved as:</div>
                <div style={{ color: 'var(--text-2)' }}><strong>{newCollegeName || '—'}</strong><br />{selCity} &bull; {selState} &bull; {zoneData?.label}</div>
              </div>
              <div style={{ marginTop: 10, fontSize: '.74rem', color: 'var(--text-3)' }}>
                💡 For full details (contacts, NAAC, fest info) use the{' '}
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '.74rem', padding: '1px 6px', display: 'inline' }}
                  onClick={() => { setAddCollegeModal(false); navigate('/colleges'); }}>
                  Colleges page →
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddCollegeModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCollege}>Add College</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
