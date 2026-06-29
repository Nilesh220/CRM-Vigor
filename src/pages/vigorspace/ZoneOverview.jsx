import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZONES, CollegeDB, VendorDB, getAllUsers, getActivityLog, getZoneColor } from '../../lib/data';
import { Globe, School, Handshake, Users, ArrowRight, MapPin } from 'lucide-react';

export default function ZoneOverview() {
  const nav = useNavigate();
  const [activeZone, setActiveZone] = useState(null);

  const zones = Object.values(ZONES).map(z => {
    const colleges = CollegeDB.all().filter(c => c.zone === z.key);
    const vendors   = VendorDB.all().filter(v => v.zone === z.key);
    const teamMembers = getAllUsers().filter(u => u.zone === z.key);
    const recentLog = getActivityLog(100).filter(a => {
      const c = CollegeDB.get(a.entityType === 'College' ? a.entityName : null);
      return teamMembers.some(u => u.id === a.userId);
    }).slice(0, 5);
    return { ...z, colleges, vendors, teamMembers, recentLog, totalContacts: colleges.reduce((s,c)=>(s+(c.contacts||[]).length),0) };
  });

  const totals = {
    colleges: zones.reduce((s,z)=>s+z.colleges.length,0),
    vendors:  zones.reduce((s,z)=>s+z.vendors.length,0),
    members:  zones.reduce((s,z)=>s+z.teamMembers.length,0),
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">VigorSpace — Zone Management</div>
          <div className="page-breadcrumb">On-ground campaign operations across 5 zones</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary btn-sm" onClick={()=>nav('/colleges')}>
            <School size={13}/> All Colleges
          </button>
          <button className="btn btn-primary btn-sm" onClick={()=>nav('/vendors')}>
            <Handshake size={13}/> All Vendors
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Top KPIs */}
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
          {[
            { label:'Total Colleges',  value:totals.colleges, icon:School,    c:'#2563eb', bg:'#eff6ff' },
            { label:'Total Vendors',   value:totals.vendors,  icon:Handshake, c:'#10b981', bg:'#ecfdf5' },
            { label:'Field Team',      value:totals.members,  icon:Users,     c:'#8b5cf6', bg:'#f5f3ff' },
            { label:'Active Zones',    value:5,               icon:Globe,     c:'#f59e0b', bg:'#fffbeb' },
          ].map(k=>{
            const Icon = k.icon;
            return (
              <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
                <div className="kpi-icon" style={{background:k.bg}}><Icon size={18} color={k.c}/></div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            );
          })}
        </div>

        {/* Zone Cards */}
        <div className="section-title">Zone Breakdown</div>
        <div className="zones-grid">
          {zones.map(z => (
            <div key={z.key} className="zone-card" style={{'--zone-c':z.color}}
              onClick={() => setActiveZone(activeZone?.key===z.key ? null : z)}>
              <div className="zone-card-header">
                <div className="zone-name">
                  <div className="zone-dot"/>
                  {z.label}
                </div>
                <span style={{fontSize:'.72rem',fontWeight:700,color:z.color,background:`${z.color}18`,padding:'2px 9px',borderRadius:'99px'}}>
                  {z.key.toUpperCase()}
                </span>
              </div>

              <div className="zone-stats">
                <div className="zone-stat">
                  <div className="zone-stat-value">{z.colleges.length}</div>
                  <div className="zone-stat-label">Colleges</div>
                </div>
                <div className="zone-stat">
                  <div className="zone-stat-value">{z.vendors.length}</div>
                  <div className="zone-stat-label">Vendors</div>
                </div>
                <div className="zone-stat">
                  <div className="zone-stat-value">{z.totalContacts}</div>
                  <div className="zone-stat-label">Contacts</div>
                </div>
              </div>

              <div className="zone-states">
                <MapPin size={10} color="var(--text-3)" style={{display:'inline',marginRight:4}}/>
                {z.states.slice(0,4).join(', ')}{z.states.length>4 ? ` +${z.states.length-4} more` : ''}
              </div>

              {z.teamMembers.length > 0 && (
                <div className="zone-lead">
                  <div style={{display:'flex',gap:-4}}>
                    {z.teamMembers.slice(0,3).map(u=>(
                      <div key={u.id} className="avatar avatar-sm" style={{border:'2px solid white',marginLeft:-4,flexShrink:0}}>
                        {u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </div>
                    ))}
                  </div>
                  <span>{z.teamMembers.length} team member{z.teamMembers.length>1?'s':''}</span>
                </div>
              )}

              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
                <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={e=>{e.stopPropagation();nav('/colleges'+'?zone='+z.key);}}>
                  <School size={12}/> Colleges
                </button>
                <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={e=>{e.stopPropagation();nav('/vendors'+'?zone='+z.key);}}>
                  <Handshake size={12}/> Vendors
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded zone detail */}
        {activeZone && (
          <div className="card" style={{borderTop:`3px solid ${activeZone.color}`}}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{color:activeZone.color}}>
                  {activeZone.label} — Detailed View
                </div>
                <div className="card-subtitle">{activeZone.states.join(' · ')}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setActiveZone(null)}>Close</button>
            </div>
            <div className="card-body">
              <div className="grid-2">
                {/* Colleges */}
                <div>
                  <div className="section-title" style={{fontSize:'.8rem',display:'flex',alignItems:'center',gap:6}}>
                    <School size={14} color="var(--text-2)"/> Colleges ({activeZone.colleges.length})
                  </div>
                  {activeZone.colleges.length ? (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {activeZone.colleges.map(c=>(
                        <div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'var(--bg)',borderRadius:'var(--r-sm)',fontSize:'.8rem'}}>
                          <div>
                            <div style={{fontWeight:600}}>{c.name}</div>
                            <div style={{fontSize:'.7rem',color:'var(--text-3)'}}>{c.city} · {c.naacGrade||'—'}</div>
                          </div>
                          <span style={{fontSize:'.68rem',background:`${activeZone.color}18`,color:activeZone.color,padding:'2px 8px',borderRadius:'99px',fontWeight:700}}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{color:'var(--text-3)',fontSize:'.8rem',padding:'20px 0'}}>No colleges added in this zone yet.</div>}
                </div>

                {/* Team */}
                <div>
                  <div className="section-title" style={{fontSize:'.8rem',display:'flex',alignItems:'center',gap:6}}>
                    <Users size={14} color="var(--text-2)"/> Field Team ({activeZone.teamMembers.length})
                  </div>
                  {activeZone.teamMembers.length ? (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {activeZone.teamMembers.map(u=>(
                        <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--bg)',borderRadius:'var(--r-sm)'}}>
                          <div className="avatar" style={{background:activeZone.color,width:32,height:32,fontSize:'.74rem'}}>
                            {u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div style={{fontSize:'.82rem',fontWeight:600}}>{u.name}</div>
                            <div style={{fontSize:'.7rem',color:'var(--text-3)'}}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{color:'var(--text-3)',fontSize:'.8rem',padding:'20px 0'}}>No field team assigned to this zone.</div>}

                  <div style={{marginTop:14}}>
                    <div className="section-title" style={{fontSize:'.8rem',display:'flex',alignItems:'center',gap:6}}>
                      <Handshake size={14} color="var(--text-2)"/> Vendors ({activeZone.vendors.length})
                    </div>
                    {activeZone.vendors.map(v=>(
                      <div key={v.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'var(--bg)',borderRadius:'var(--r-sm)',fontSize:'.78rem',marginBottom:5}}>
                        <div>
                          <div style={{fontWeight:600}}>{v.name}</div>
                          <div style={{fontSize:'.7rem',color:'var(--text-3)'}}>{v.category} · {v.city}</div>
                        </div>
                        <span style={{fontSize:'.68rem',background:v.status==='Active'?'#d1fae5':'#f3f4f6',color:v.status==='Active'?'#065f46':'var(--text-3)',padding:'2px 8px',borderRadius:'99px',fontWeight:700}}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
