import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollegeDB, ZONES, genId, logActivity } from '../../lib/data';
import { useToast, useSession } from '../../contexts/AppContext';
import { MapPin, School, Plus, ChevronRight, ChevronLeft, X, Search, Building2, ExternalLink } from 'lucide-react';

// All predefined states from zones
const ZONE_STATES = Object.values(ZONES).flatMap(z => z.states);

function getZoneColor(state) {
  for (const z of Object.values(ZONES)) {
    if (z.states.includes(state)) return z.color;
  }
  return '#6b7280';
}
function getZoneLabel(state) {
  for (const z of Object.values(ZONES)) {
    if (z.states.includes(state)) return z.label;
  }
  return 'Other';
}

const LS_STATES = 'vl_map_custom_states';
const LS_CITIES = 'vl_map_custom_cities';

export default function MapView() {
  const toast = useToast();
  const session = useSession();
  const navigate = useNavigate();
  const canEdit = ['admin', 'founder', 'operations', 'vigorspace'].includes(session?.role);

  const [colleges, setColleges] = useState(() => CollegeDB.all());
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [search, setSearch] = useState('');

  // Custom states/cities stored locally
  const [customStates, setCustomStates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_STATES) || '[]'); } catch { return []; }
  });
  const [customCities, setCustomCities] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_CITIES) || '{}'); } catch { return {}; }
  });

  // Modals
  const [addStateModal, setAddStateModal] = useState(false);
  const [addCityModal, setAddCityModal] = useState(false);
  const [addCollegeModal, setAddCollegeModal] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('');

  useEffect(() => {
    CollegeDB.syncFromDB().then(rows => setColleges(rows));
  }, []);

  // Derive all states: predefined + from college records + custom
  const allStates = [...new Set([
    ...ZONE_STATES,
    ...colleges.map(c => c.state).filter(Boolean),
    ...customStates,
  ])].sort();

  const filteredStates = search
    ? allStates.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : allStates;

  // Cities for selected state
  const collegeCities = colleges.filter(c => c.state === selectedState).map(c => c.city).filter(Boolean);
  const allCities = [...new Set([...collegeCities, ...(customCities[selectedState] || [])])].sort();
  const filteredCities = search
    ? allCities.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : allCities;

  // Colleges for selected city
  const cityColleges = selectedCity
    ? colleges.filter(c => c.state === selectedState && c.city === selectedCity)
    : [];

  // â”€â”€ Add handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function handleAddState() {
    const name = newStateName.trim();
    if (!name) { toast('Enter a state name', 'warning'); return; }
    if (allStates.includes(name)) { toast('State already exists', 'info'); return; }
    const updated = [...customStates, name];
    setCustomStates(updated);
    localStorage.setItem(LS_STATES, JSON.stringify(updated));
    setNewStateName(''); setAddStateModal(false);
    toast(`${name} added!`, 'success');
  }

  function handleAddCity() {
    const name = newCityName.trim();
    if (!name || !selectedState) { toast('Enter a city name', 'warning'); return; }
    if (allCities.includes(name)) { toast('City already exists', 'info'); return; }
    const updated = { ...customCities, [selectedState]: [...(customCities[selectedState] || []), name] };
    setCustomCities(updated);
    localStorage.setItem(LS_CITIES, JSON.stringify(updated));
    setNewCityName(''); setAddCityModal(false);
    toast(`${name} added to ${selectedState}!`, 'success');
  }

  async function handleAddCollege() {
    const name = newCollegeName.trim();
    if (!name || !selectedState || !selectedCity) { toast('Enter college name', 'warning'); return; }
    const payload = {
      id: genId('col'), name, state: selectedState, city: selectedCity,
      zone: Object.values(ZONES).find(z => z.states.includes(selectedState))?.key || '',
      status: 'Active', contacts: [],
      createdBy: session?.id, createdAt: new Date().toISOString(),
    };
    await CollegeDB.add(payload);
    logActivity('Added', 'College', name, `${selectedCity}, ${selectedState}`);
    setColleges(CollegeDB.all());
    setNewCollegeName(''); setAddCollegeModal(false);
    toast(`${name} added!`, 'success');
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function stateCollegeCount(state) {
    return colleges.filter(c => c.state === state).length;
  }
  function stateCityCount(state) {
    const from = [...new Set(colleges.filter(c => c.state === state).map(c => c.city).filter(Boolean))];
    const custom = customCities[state] || [];
    return new Set([...from, ...custom]).size;
  }
  function cityCollegeCount(city) {
    return colleges.filter(c => c.state === selectedState && c.city === city).length;
  }

  const level = selectedCity ? 3 : selectedState ? 2 : 1;

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* â”€â”€ Breadcrumb â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '.83rem', flexWrap: 'wrap' }}>
        <MapPin size={14} color="var(--primary)" />
        <span
          style={{ cursor: level > 1 ? 'pointer' : 'default', color: level > 1 ? 'var(--primary)' : 'var(--text)', fontWeight: level === 1 ? 700 : 400 }}
          onClick={() => { setSelectedState(null); setSelectedCity(null); setSearch(''); }}
        >All States</span>
        {selectedState && <>
          <ChevronRight size={12} color="var(--text-3)" />
          <span
            style={{ cursor: level > 2 ? 'pointer' : 'default', color: level > 2 ? 'var(--primary)' : 'var(--text)', fontWeight: level === 2 ? 700 : 400 }}
            onClick={() => { setSelectedCity(null); setSearch(''); }}
          >{selectedState}</span>
        </>}
        {selectedCity && <>
          <ChevronRight size={12} color="var(--text-3)" />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedCity}</span>
        </>}
      </div>

      {/* â”€â”€ Page Title + Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 3 }}>
            {level === 1 && 'All States'}
            {level === 2 && `${selectedState} â€” Cities`}
            {level === 3 && `${selectedCity} â€” Colleges`}
          </h2>
          <p style={{ fontSize: '.82rem', color: 'var(--text-3)', margin: 0 }}>
            {level === 1 && `${filteredStates.length} states Â· ${colleges.length} total colleges`}
            {level === 2 && `${filteredCities.length} cities Â· ${colleges.filter(c => c.state === selectedState).length} colleges in ${selectedState}`}
            {level === 3 && `${cityColleges.length} college${cityColleges.length !== 1 ? 's' : ''} in ${selectedCity}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {level > 1 && (
            <button className="btn btn-secondary btn-sm" onClick={() => { if (level === 3) { setSelectedCity(null); setSearch(''); } else { setSelectedState(null); setSelectedCity(null); setSearch(''); } }}>
              <ChevronLeft size={13} /> Back
            </button>
          )}
          {canEdit && level === 1 && <button className="btn btn-primary btn-sm" onClick={() => setAddStateModal(true)}><Plus size={13} /> Add State</button>}
          {canEdit && level === 2 && <button className="btn btn-primary btn-sm" onClick={() => setAddCityModal(true)}><Plus size={13} /> Add City</button>}
          {canEdit && level === 3 && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/colleges')}><ExternalLink size={13} /> All Colleges</button>
              <button className="btn btn-primary btn-sm" onClick={() => setAddCollegeModal(true)}><Plus size={13} /> Add College</button>
            </>
          )}
        </div>
      </div>

      {/* â”€â”€ Search bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {level < 3 && (
        <div className="search-wrap" style={{ maxWidth: 320, marginBottom: 18 }}>
          <Search size={14} />
          <input
            placeholder={level === 1 ? 'Search statesâ€¦' : 'Search citiesâ€¦'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 1 â€” States                              */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level === 1 && (
        filteredStates.length === 0 ? (
          <div className="empty-state">
            <MapPin size={40} color="var(--border-2)" />
            <div className="empty-state-title">No states found</div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setAddStateModal(true)}><Plus size={13} /> Add State</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {filteredStates.map(state => {
              const color = getZoneColor(state);
              const colleges_ = stateCollegeCount(state);
              const cities_ = stateCityCount(state);
              return (
                <div
                  key={state}
                  onClick={() => { setSelectedState(state); setSearch(''); }}
                  style={{
                    background: 'var(--card)', border: `1.5px solid var(--border)`,
                    borderRadius: 14, padding: '16px 16px', cursor: 'pointer',
                    transition: 'all .18s', position: 'relative', overflow: 'hidden'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 20px ${color}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Color stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '14px 0 0 14px' }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: '.92rem', lineHeight: 1.3 }}>{state}</div>
                      <ChevronRight size={14} color="var(--text-3)" />
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: 8 }}>{getZoneLabel(state)}</div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: color }}>{cities_}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Cities</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{colleges_}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Colleges</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Add State ghost card */}
            {canEdit && (
              <div
                onClick={() => setAddStateModal(true)}
                style={{ border: '2px dashed var(--border-2)', borderRadius: 14, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 110, gap: 8, color: 'var(--text-3)', transition: 'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Plus size={20} />
                <span style={{ fontSize: '.8rem', fontWeight: 600 }}>Add State</span>
              </div>
            )}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 2 â€” Cities in State                     */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level === 2 && (
        filteredCities.length === 0 ? (
          <div className="empty-state">
            <Building2 size={40} color="var(--border-2)" />
            <div className="empty-state-title">No cities found in {selectedState}</div>
            <div className="empty-state-text">Add a city or add colleges with this state to see cities.</div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setAddCityModal(true)}><Plus size={13} /> Add City</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {filteredCities.map(city => {
              const count = cityCollegeCount(city);
              const color = getZoneColor(selectedState);
              return (
                <div
                  key={city}
                  onClick={() => { setSelectedCity(city); setSearch(''); }}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 14px', cursor: 'pointer', transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={13} color={color} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{city}</span>
                    </div>
                    <ChevronRight size={13} color="var(--text-3)" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <School size={12} color="var(--text-3)" />
                    <span style={{ fontSize: '.78rem', color: count > 0 ? 'var(--text)' : 'var(--text-3)', fontWeight: count > 0 ? 700 : 400 }}>
                      {count} college{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Add City ghost card */}
            {canEdit && (
              <div
                onClick={() => setAddCityModal(true)}
                style={{ border: '2px dashed var(--border-2)', borderRadius: 12, padding: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 86, gap: 6, color: 'var(--text-3)', transition: 'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Plus size={18} />
                <span style={{ fontSize: '.76rem', fontWeight: 600 }}>Add City</span>
              </div>
            )}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 3 â€” Colleges in City                    */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level === 3 && (
        cityColleges.length === 0 ? (
          <div className="empty-state">
            <School size={40} color="var(--border-2)" />
            <div className="empty-state-title">No colleges in {selectedCity} yet</div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setAddCollegeModal(true)}><Plus size={13} /> Add College</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {cityColleges.map(c => (
              <div key={c.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <School size={16} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>{c.affiliation || c.type || 'â€”'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {c.naacGrade && <span className="badge badge-blue" style={{ fontSize: '.65rem' }}>NAAC {c.naacGrade}</span>}
                  <span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '.65rem' }}>{c.status || 'Active'}</span>
                </div>
                {c.contacts?.length > 0 && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                    {c.contacts.length} contact{c.contacts.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {c.website && (
                    <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"
                      className="btn btn-ghost btn-sm" style={{ fontSize: '.72rem', padding: '3px 8px', textDecoration: 'none' }}>
                      <ExternalLink size={11} /> Website
                    </a>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '.72rem', padding: '3px 8px', marginLeft: 'auto' }} onClick={() => navigate('/colleges')}>
                    View â†’
                  </button>
                </div>
              </div>
            ))}
            {/* Add College card */}
            {canEdit && (
              <div
                onClick={() => setAddCollegeModal(true)}
                style={{ border: '2px dashed var(--border-2)', borderRadius: 14, padding: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: 8, color: 'var(--text-3)', transition: 'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Plus size={22} />
                <span style={{ fontSize: '.8rem', fontWeight: 600 }}>Add College</span>
              </div>
            )}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* MODALS                                        */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* Add State Modal */}
      {addStateModal && (
        <div className="overlay" onClick={() => setAddStateModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><MapPin size={15} style={{ marginRight: 6 }} />Add State</span>
              <button className="modal-close" onClick={() => setAddStateModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">State Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Telangana" value={newStateName}
                  onChange={e => setNewStateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddState()}
                  autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddStateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddState}>Add State</button>
            </div>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      {addCityModal && (
        <div className="overlay" onClick={() => setAddCityModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><Building2 size={15} style={{ marginRight: 6 }} />Add City â€” {selectedState}</span>
              <button className="modal-close" onClick={() => setAddCityModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">City Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Hyderabad" value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCity()}
                  autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddCityModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCity}>Add City</button>
            </div>
          </div>
        </div>
      )}

      {/* Add College Modal */}
      {addCollegeModal && (
        <div className="overlay" onClick={() => setAddCollegeModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><School size={15} style={{ marginRight: 6 }} />Add College â€” {selectedCity}</span>
              <button className="modal-close" onClick={() => setAddCollegeModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">College Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Osmania University" value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCollege()}
                  autoFocus />
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: '.78rem', color: 'var(--text-3)' }}>
                ðŸ“ Will be saved as: <strong>{newCollegeName || '...'}</strong>, {selectedCity}, {selectedState}
              </div>
              <div style={{ marginTop: 8, fontSize: '.75rem', color: 'var(--text-3)' }}>
                For full details (NAAC, contacts, fest info), go to the{' '}
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '.75rem', padding: '1px 6px', display: 'inline' }} onClick={() => { setAddCollegeModal(false); navigate('/colleges'); }}>
                  Colleges page â†’
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



