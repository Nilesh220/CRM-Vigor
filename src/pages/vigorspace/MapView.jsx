import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollegeDB, ZONES, genId, logActivity } from '../../lib/data';
import { useToast, useSession } from '../../contexts/AppContext';
import { MapPin, School, Plus, ChevronRight, ChevronLeft, X, Search, Building2, ExternalLink, Globe } from 'lucide-react';

const LS_CITIES = 'vl_map_custom_cities'; // { "stateName": ["City1","City2"] }

const ZONE_GRADIENT = {
  north:   'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  south:   'linear-gradient(135deg,#047857,#10b981)',
  east:    'linear-gradient(135deg,#b45309,#f59e0b)',
  west:    'linear-gradient(135deg,#6d28d9,#8b5cf6)',
  central: 'linear-gradient(135deg,#b91c1c,#ef4444)',
};

export default function MapView() {
  const toast    = useToast();
  const session  = useSession();
  const navigate = useNavigate();
  const canEdit  = ['admin','founder','operations','vigorspace'].includes(session?.role);

  /* â”€â”€ data â”€â”€ */
  const [colleges, setColleges] = useState(() => CollegeDB.all());

  // Sync from DB on mount so newly added colleges appear immediately
  useEffect(() => {
    CollegeDB.syncFromDB().then(rows => setColleges(rows));
  }, []);

  /* â”€â”€ drill-down state â”€â”€ */
  const [selZone,  setSelZone]  = useState(null);
  const [selState, setSelState] = useState(null);
  const [selCity,  setSelCity]  = useState(null);
  const [search,   setSearch]   = useState('');

  /* â”€â”€ custom cities (persisted in localStorage) â”€â”€ */
  const [customCities, setCustomCities] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_CITIES) || '{}'); } catch { return {}; }
  });

  /* â”€â”€ modals â”€â”€ */
  const [addCityModal,    setAddCityModal]    = useState(false);
  const [addCollegeModal, setAddCollegeModal] = useState(false);
  const [newCityName,     setNewCityName]     = useState('');
  const [newCollegeName,  setNewCollegeName]  = useState('');

  /* â”€â”€ computed level â”€â”€ */
  const level = selCity ? 4 : selState ? 3 : selZone ? 2 : 1;

  const zoneData  = selZone  ? ZONES[selZone]  : null;
  const zoneColor = zoneData?.color ?? '#6b7280';

  /* â”€â”€ helpers â”€â”€ */
  function collegesInZone(zk)    { return colleges.filter(c => c.zone === zk); }
  function collegesInState(st)   { return colleges.filter(c => c.zone === selZone && c.state === st); }
  function collegesInCity(ct)    { return colleges.filter(c => c.zone === selZone && c.state === selState && c.city === ct); }

  function citiesForState(st) {
    const fromColleges = colleges
      .filter(c => c.zone === selZone && c.state === st)
      .map(c => c.city)
      .filter(Boolean);
    const custom = customCities[st] || [];
    return [...new Set([...fromColleges, ...custom])].sort();
  }

  /* â”€â”€ add city â”€â”€ */
  function handleAddCity() {
    const name = newCityName.trim();
    if (!name) { toast('Enter a city name','warning'); return; }
    const existing = citiesForState(selState);
    if (existing.includes(name)) { toast('City already exists','info'); return; }
    const updated = { ...customCities, [selState]: [...(customCities[selState]||[]), name] };
    setCustomCities(updated);
    localStorage.setItem(LS_CITIES, JSON.stringify(updated));
    setNewCityName(''); setAddCityModal(false);
    toast(`${name} added!`, 'success');
  }

  /* â”€â”€ add college â”€â”€ */
  async function handleAddCollege() {
    const name = newCollegeName.trim();
    if (!name) { toast('Enter college name','warning'); return; }
    const payload = {
      id: genId('col'), name, state: selState, city: selCity,
      zone: selZone, status: 'Active', contacts: [],
      createdBy: session?.id, createdAt: new Date().toISOString(),
    };
    await CollegeDB.add(payload);
    logActivity('Added','College', name, `${selCity}, ${selState}`);
    setColleges(CollegeDB.all());
    setNewCollegeName(''); setAddCollegeModal(false);
    toast(`${name} added!`, 'success');
  }

  /* â”€â”€ nav helpers â”€â”€ */
  function goBack() {
    setSearch('');
    if (level === 4) setSelCity(null);
    else if (level === 3) setSelState(null);
    else if (level === 2) setSelZone(null);
  }

  /* â”€â”€ filtered lists â”€â”€ */
  const statesInZone = selZone
    ? ZONES[selZone].states.filter(s => !search || s.toLowerCase().includes(search.toLowerCase()))
    : [];
  const cities = selState
    ? citiesForState(selState).filter(c => !search || c.toLowerCase().includes(search.toLowerCase()))
    : [];
  const cityColleges = selCity ? collegesInCity(selCity) : [];

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div style={{ paddingBottom: 48 }}>

      {/* â”€â”€ Breadcrumb â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, fontSize:'.82rem', flexWrap:'wrap', color:'var(--text-3)' }}>
        <Globe size={13} />
        <span style={{ cursor: level>1?'pointer':'default', fontWeight: level===1?700:400, color: level>1?'var(--primary)':'var(--text)' }}
          onClick={() => { setSelZone(null); setSelState(null); setSelCity(null); setSearch(''); }}>
          All Zones
        </span>
        {selZone && <>
          <ChevronRight size={12} />
          <span style={{ cursor: level>2?'pointer':'default', fontWeight: level===2?700:400, color: level>2?'var(--primary)':'var(--text)' }}
            onClick={() => { setSelState(null); setSelCity(null); setSearch(''); }}>
            {zoneData?.label}
          </span>
        </>}
        {selState && <>
          <ChevronRight size={12} />
          <span style={{ cursor: level>3?'pointer':'default', fontWeight: level===3?700:400, color: level>3?'var(--primary)':'var(--text)' }}
            onClick={() => { setSelCity(null); setSearch(''); }}>
            {selState}
          </span>
        </>}
        {selCity && <>
          <ChevronRight size={12} />
          <span style={{ fontWeight:700, color:'var(--text)' }}>{selCity}</span>
        </>}
      </div>

      {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:18 }}>
        <div>
          <h2 style={{ fontSize:'1.15rem', fontWeight:800, marginBottom:3 }}>
            {level===1 && 'Zones â€” India'}
            {level===2 && `${zoneData?.label} â€” States`}
            {level===3 && `${selState} â€” Cities`}
            {level===4 && `${selCity} â€” Colleges`}
          </h2>
          <p style={{ fontSize:'.8rem', color:'var(--text-3)', margin:0 }}>
            {level===1 && `${Object.keys(ZONES).length} zones Â· ${colleges.length} total colleges`}
            {level===2 && `${ZONES[selZone].states.length} states Â· ${collegesInZone(selZone).length} colleges`}
            {level===3 && `${cities.length} cities Â· ${collegesInState(selState).length} colleges in ${selState}`}
            {level===4 && `${cityColleges.length} college${cityColleges.length!==1?'s':''} in ${selCity}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {level > 1 && (
            <button className="btn btn-secondary btn-sm" onClick={goBack}>
              <ChevronLeft size={13} /> Back
            </button>
          )}
          {canEdit && level===3 && (
            <button className="btn btn-primary btn-sm" onClick={() => setAddCityModal(true)}>
              <Plus size={13} /> Add City
            </button>
          )}
          {canEdit && level===4 && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/colleges')}>
                <ExternalLink size={13} /> All Colleges
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setAddCollegeModal(true)}>
                <Plus size={13} /> Add College
              </button>
            </>
          )}
        </div>
      </div>

      {/* â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {level > 1 && level < 4 && (
        <div className="search-wrap" style={{ maxWidth:300, marginBottom:18 }}>
          <Search size={13} />
          <input
            placeholder={level===2?'Search statesâ€¦':level===3?'Search citiesâ€¦':'Searchâ€¦'}
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={12}/></button>}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 1 â€” Zones                                     */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level===1 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 }}>
          {Object.values(ZONES).map(z => {
            const zColleges = collegesInZone(z.key).length;
            return (
              <div key={z.key}
                onClick={() => { setSelZone(z.key); setSearch(''); }}
                style={{ background:ZONE_GRADIENT[z.key], borderRadius:16, padding:'22px 20px', cursor:'pointer', color:'#fff', boxShadow:'0 4px 16px rgba(0,0,0,.12)', transition:'transform .15s,box-shadow .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(0,0,0,.2)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'; }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'.95rem' }}>{z.label}</div>
                    <div style={{ fontSize:'.72rem', opacity:.8, marginTop:2 }}>{z.states.length} states</div>
                  </div>
                  <Globe size={20} style={{ opacity:.7 }}/>
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'1.3rem' }}>{zColleges}</div>
                    <div style={{ fontSize:'.68rem', opacity:.8 }}>Colleges</div>
                  </div>
                </div>
                <div style={{ marginTop:14, fontSize:'.76rem', opacity:.85, display:'flex', alignItems:'center', gap:5 }}>
                  View States <ChevronRight size={13}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 2 â€” States in Zone                            */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level===2 && (
        statesInZone.length===0 ? (
          <div className="empty-state"><MapPin size={36} color="var(--border-2)"/><div className="empty-state-title">No states found</div></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:13 }}>
            {statesInZone.map(state => {
              const stCols  = collegesInState(state).length;
              const stCities = citiesForState(state).length;
              return (
                <div key={state}
                  onClick={() => { setSelState(state); setSearch(''); }}
                  style={{ background:'var(--card)', border:`1.5px solid var(--border)`, borderRadius:13, padding:'14px 14px', cursor:'pointer', position:'relative', overflow:'hidden', transition:'all .16s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=zoneColor; e.currentTarget.style.boxShadow=`0 4px 18px ${zoneColor}28`; e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
                  {/* Zone color stripe */}
                  <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:zoneColor, borderRadius:'13px 0 0 13px' }}/>
                  <div style={{ paddingLeft:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontWeight:700, fontSize:'.9rem' }}>{state}</span>
                      <ChevronRight size={13} color="var(--text-3)"/>
                    </div>
                    <div style={{ display:'flex', gap:16 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'1rem', color:zoneColor }}>{stCities}</div>
                        <div style={{ fontSize:'.66rem', color:'var(--text-3)' }}>Cities</div>
                      </div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'1rem' }}>{stCols}</div>
                        <div style={{ fontSize:'.66rem', color:'var(--text-3)' }}>Colleges</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 3 â€” Cities in State                           */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level===3 && (
        cities.length===0 ? (
          <div className="empty-state">
            <Building2 size={36} color="var(--border-2)"/>
            <div className="empty-state-title">No cities yet in {selState}</div>
            <div className="empty-state-text">Cities appear automatically when you add colleges with a city. Or add a city manually.</div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => setAddCityModal(true)}><Plus size={13}/> Add City</button>}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12 }}>
            {cities.map(city => {
              const count = collegesInCity(city).length;
              return (
                <div key={city}
                  onClick={() => { setSelCity(city); setSearch(''); }}
                  style={{ background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px', cursor:'pointer', transition:'all .16s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=zoneColor; e.currentTarget.style.boxShadow=`0 4px 16px ${zoneColor}22`; e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:`${zoneColor}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <MapPin size={13} color={zoneColor}/>
                      </div>
                      <span style={{ fontWeight:700, fontSize:'.86rem' }}>{city}</span>
                    </div>
                    <ChevronRight size={13} color="var(--text-3)"/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <School size={12} color="var(--text-3)"/>
                    <span style={{ fontSize:'.76rem', fontWeight: count>0?700:400, color: count>0?'var(--text)':'var(--text-3)' }}>
                      {count} college{count!==1?'s':''}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* + Add City ghost card */}
            {canEdit && (
              <div onClick={() => setAddCityModal(true)}
                style={{ border:'2px dashed var(--border-2)', borderRadius:12, padding:'14px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:86, gap:6, color:'var(--text-3)', transition:'all .16s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-2)'; e.currentTarget.style.color='var(--text-3)'; }}>
                <Plus size={18}/><span style={{ fontSize:'.76rem', fontWeight:600 }}>Add City</span>
              </div>
            )}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* LEVEL 4 â€” Colleges in City                          */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {level===4 && (
        cityColleges.length===0 ? (
          <div className="empty-state">
            <School size={36} color="var(--border-2)"/>
            <div className="empty-state-title">No colleges in {selCity} yet</div>
            <div className="empty-state-text">Add colleges with zone=<strong>{selZone}</strong>, state=<strong>{selState}</strong>, city=<strong>{selCity}</strong> and they'll appear here automatically.</div>
            {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => setAddCollegeModal(true)}><Plus size={13}/> Quick Add</button>}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
            {cityColleges.map(c => (
              <div key={c.id} className="card" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <School size={16} color="#2563eb"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'.86rem', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-3)' }}>{c.affiliation || c.type || 'â€”'}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  {c.naacGrade && <span className="badge badge-blue" style={{ fontSize:'.64rem' }}>NAAC {c.naacGrade}</span>}
                  <span className={`badge ${c.status==='Active'?'badge-green':'badge-gray'}`} style={{ fontSize:'.64rem' }}>{c.status||'Active'}</span>
                  {(c.contacts?.length>0) && <span className="badge badge-gray" style={{ fontSize:'.64rem' }}>{c.contacts.length} contact{c.contacts.length!==1?'s':''}</span>}
                </div>
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  {c.website && (
                    <a href={c.website.startsWith('http')?c.website:`https://${c.website}`} target="_blank" rel="noreferrer"
                      className="btn btn-ghost btn-sm" style={{ fontSize:'.71rem', padding:'3px 8px', textDecoration:'none' }}>
                      <ExternalLink size={10}/> Website
                    </a>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:'.71rem', padding:'3px 8px', marginLeft:'auto' }} onClick={() => navigate('/colleges')}>
                    Full View â†’
                  </button>
                </div>
              </div>
            ))}
            {/* + Add College ghost card */}
            {canEdit && (
              <div onClick={() => setAddCollegeModal(true)}
                style={{ border:'2px dashed var(--border-2)', borderRadius:14, padding:'14px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:120, gap:8, color:'var(--text-3)', transition:'all .16s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-2)'; e.currentTarget.style.color='var(--text-3)'; }}>
                <Plus size={22}/><span style={{ fontSize:'.8rem', fontWeight:600 }}>Add College</span>
              </div>
            )}
          </div>
        )
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* MODALS                                              */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* Add City */}
      {addCityModal && (
        <div className="overlay" onClick={() => setAddCityModal(false)}>
          <div className="modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><Building2 size={14} style={{ marginRight:7 }}/>Add City â€” {selState}</span>
              <button className="modal-close" onClick={() => setAddCityModal(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">City Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Pune" value={newCityName}
                  onChange={e=>setNewCityName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleAddCity()} autoFocus/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddCityModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCity}>Add City</button>
            </div>
          </div>
        </div>
      )}

      {/* Add College */}
      {addCollegeModal && (
        <div className="overlay" onClick={() => setAddCollegeModal(false)}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><School size={14} style={{ marginRight:7 }}/>Add College â€” {selCity}</span>
              <button className="modal-close" onClick={() => setAddCollegeModal(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">College Name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Savitribai Phule Pune University" value={newCollegeName}
                  onChange={e=>setNewCollegeName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleAddCollege()} autoFocus/>
              </div>
              <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg)', borderRadius:8, fontSize:'.78rem', color:'var(--text-3)', lineHeight:1.6 }}>
                ðŸ“ <strong>{newCollegeName||'College name'}</strong><br/>
                {selCity} Â· {selState} Â· {zoneData?.label}
              </div>
              <div style={{ marginTop:10, fontSize:'.74rem', color:'var(--text-3)' }}>
                ðŸ’¡ For full details (contacts, NAAC grade, fest info) open the{' '}
                <button className="btn btn-ghost btn-sm" style={{ fontSize:'.74rem', padding:'1px 6px', display:'inline' }}
                  onClick={() => { setAddCollegeModal(false); navigate('/colleges'); }}>
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

