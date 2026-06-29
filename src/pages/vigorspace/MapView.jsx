import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollegeDB, VendorDB, InfluencerDB, ZONES } from '../../lib/data';
import { Globe, School, Handshake, Star, ChevronRight, ChevronLeft, MapPin, ArrowRight } from 'lucide-react';

const ZONE_BG = {
  north: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  south: 'linear-gradient(135deg, #047857, #10b981)',
  east:  'linear-gradient(135deg, #b45309, #f59e0b)',
  west:  'linear-gradient(135deg, #6d28d9, #8b5cf6)',
  central:'linear-gradient(135deg, #b91c1c, #ef4444)',
};

export default function MapView() {
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const navigate = useNavigate();

  const colleges = CollegeDB.all();
  const vendors = VendorDB.all();
  const influencers = InfluencerDB.all();

  // --- Zone-level counts ---
  const zoneSummary = Object.values(ZONES).map(z => ({
    ...z,
    colleges: colleges.filter(c => c.zone === z.key).length,
    vendors: vendors.filter(v => v.zone === z.key).length,
    influencers: influencers.filter(i => i.zone === z.key).length,
  }));

  // --- State-level counts for selected zone ---
  const stateSummary = selectedZone
    ? ZONES[selectedZone].states.map(state => ({
        state,
        colleges: colleges.filter(c => c.zone === selectedZone && (c.state === state || c.city?.includes(state))),
        vendors: vendors.filter(v => v.zone === selectedZone && (v.region === state || v.city?.includes(state))),
        influencers: influencers.filter(i => i.zone === selectedZone && i.city?.toLowerCase().includes(state.toLowerCase())),
      })).filter(s => s.colleges.length + s.vendors.length + s.influencers.length > 0)
    : [];

  // --- Entries for selected state ---
  const stateColleges = selectedState ? colleges.filter(c => c.zone === selectedZone && (c.state === selectedState || c.city?.includes(selectedState))) : [];
  const stateVendors = selectedState ? vendors.filter(v => v.zone === selectedZone && (v.region === selectedState || v.city?.includes(selectedState))) : [];
  const stateInfluencers = selectedState ? influencers.filter(i => i.zone === selectedZone && i.city?.toLowerCase().includes(selectedState.toLowerCase())) : [];

  const zoneData = selectedZone ? ZONES[selectedZone] : null;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '.85rem', color: 'var(--text-3)' }}>
        <Globe size={14} />
        <span style={{ cursor: 'pointer', color: selectedZone ? 'var(--primary)' : 'var(--text)', fontWeight: selectedZone ? 400 : 700 }} onClick={() => { setSelectedZone(null); setSelectedState(null); }}>
          All Zones
        </span>
        {selectedZone && (
          <>
            <ChevronRight size={13} />
            <span style={{ cursor: 'pointer', color: selectedState ? 'var(--primary)' : 'var(--text)', fontWeight: selectedState ? 400 : 700 }}
              onClick={() => setSelectedState(null)}>
              {zoneData?.label}
            </span>
          </>
        )}
        {selectedState && (
          <>
            <ChevronRight size={13} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedState}</span>
          </>
        )}
      </div>

      {/* Level 1: Zones */}
      {!selectedZone && (
        <>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6 }}>Zone Overview — India</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 20 }}>Click any zone to drill down by state.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {zoneSummary.map(z => (
              <div key={z.key}
                onClick={() => setSelectedZone(z.key)}
                style={{ background: ZONE_BG[z.key], borderRadius: 16, padding: '24px 20px', cursor: 'pointer', color: '#fff', transition: 'transform .15s, box-shadow .15s', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{z.label}</div>
                    <div style={{ fontSize: '.75rem', opacity: .8, marginTop: 3 }}>{z.states.length} states</div>
                  </div>
                  <Globe size={22} style={{ opacity: .7 }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{icon: School, count: z.colleges, label: 'Colleges'}, {icon: Handshake, count: z.vendors, label: 'Vendors'}, {icon: Star, count: z.influencers, label: 'Creators'}].map(({ icon: Icon, count, label }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{count}</div>
                      <div style={{ fontSize: '.68rem', opacity: .8 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', opacity: .85 }}>
                  View States <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Level 2: States in zone */}
      {selectedZone && !selectedState && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZone(null)}>
              <ChevronLeft size={14} /> Back to Zones
            </button>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{zoneData?.label} — States</h2>
              <p style={{ fontSize: '.83rem', color: 'var(--text-3)' }}>Click a state card to see its records.</p>
            </div>
          </div>
          {stateSummary.length === 0 ? (
            <div className="empty-state"><MapPin size={40} color="var(--border-2)" /><div className="empty-state-title">No data mapped to states yet</div><div className="empty-state-text">Add college/vendor/influencer records with a zone to see them here.</div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {stateSummary.map(s => (
                <div key={s.state}
                  onClick={() => setSelectedState(s.state)}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zoneData.color; e.currentTarget.style.boxShadow = `0 4px 16px ${zoneData.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{s.state}</div>
                    <MapPin size={16} color={zoneData.color} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[{icon: School, count: s.colleges.length, label: 'Colleges'}, {icon: Handshake, count: s.vendors.length, label: 'Vendors'}, {icon: Star, count: s.influencers.length, label: 'Creators'}].map(({ icon: Icon, count, label }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <Icon size={13} color={count > 0 ? zoneData.color : 'var(--text-3)'} style={{ marginBottom: 2 }} />
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: count > 0 ? 'var(--text)' : 'var(--text-3)' }}>{count}</div>
                        <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Level 3: Records in state */}
      {selectedState && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedState(null)}>
              <ChevronLeft size={14} /> Back to {zoneData?.label}
            </button>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedState}</h2>
              <p style={{ fontSize: '.83rem', color: 'var(--text-3)' }}>{stateColleges.length + stateVendors.length + stateInfluencers.length} records in this state</p>
            </div>
          </div>

          {/* Colleges */}
          {stateColleges.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <School size={16} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Colleges ({stateColleges.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/colleges')} style={{ marginLeft: 'auto', fontSize: '.75rem' }}>View All <ArrowRight size={12} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {stateColleges.slice(0, 8).map(c => (
                  <div key={c.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{c.city} • {c.naacGrade && <span className="badge badge-blue" style={{ fontSize: '.65rem', padding: '1px 6px' }}>{c.naacGrade}</span>}</div>
                    <div style={{ marginTop: 6 }}><span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '.65rem' }}>{c.status}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vendors */}
          {stateVendors.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Handshake size={16} color="#7c3aed" />
                <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Vendors ({stateVendors.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ marginLeft: 'auto', fontSize: '.75rem' }}>View All <ArrowRight size={12} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {stateVendors.slice(0, 8).map(v => (
                  <div key={v.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 4 }}>{v.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{v.city} • {v.category}</div>
                    <div style={{ marginTop: 6 }}><span className={`badge ${v.status === 'Active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '.65rem' }}>{v.status}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Influencers */}
          {stateInfluencers.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Star size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Creators ({stateInfluencers.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/influencers')} style={{ marginLeft: 'auto', fontSize: '.75rem' }}>View All <ArrowRight size={12} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {stateInfluencers.slice(0, 8).map(i => (
                  <div key={i.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 4 }}>{i.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{i.city} • {i.genre}</div>
                    <div style={{ marginTop: 6 }}><span className="badge badge-purple" style={{ fontSize: '.65rem' }}>{i.tier || 'Nano'}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {stateColleges.length + stateVendors.length + stateInfluencers.length === 0 && (
            <div className="empty-state"><MapPin size={40} color="var(--border-2)" /><div className="empty-state-title">No records found for {selectedState}</div></div>
          )}
        </>
      )}
    </div>
  );
}
