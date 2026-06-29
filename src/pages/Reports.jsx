import { useState, useEffect } from 'react';
import { useSession } from '../contexts/AppContext';
import { getActivityLog, syncActivityFromDB, formatDateTime, timeAgo, canExport, logActivity, CollegeDB, InfluencerDB, VendorDB } from '../lib/data';
import { FileBarChart, Activity, School, Star, Handshake, CheckSquare, TrendingUp, Users, Download, Filter } from 'lucide-react';

const ENTITY_ICONS = { College:School, Influencer:Star, Vendor:Handshake, Task:CheckSquare, Reimbursement:TrendingUp, User:Users, Revenue:TrendingUp, Budget:TrendingUp };
const ENTITY_COLORS = { College:'#dbeafe', Influencer:'#ede9fe', Vendor:'#d1fae5', Task:'#fef3c7', Reimbursement:'#fee2e2', User:'#f0f9ff', Revenue:'#d1fae5', Budget:'#fef3c7' };
const ACT_BADGE = { Added:'badge-green', Updated:'badge-blue', Deleted:'badge-red', Exported:'badge-purple', Approved:'badge-teal', Rejected:'badge-red', Created:'badge-navy', Submitted:'badge-gray', Moved:'badge-yellow' };

export default function Reports() {
  const session = useSession();
  const isLead = ['admin', 'founder', 'operations', 'hr', 'finance'].includes(session?.role);
  const [log, setLog] = useState(() => {
    const all = getActivityLog(500);
    return isLead ? all : all.filter(a => a.userId === session?.id);
  });
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 30;

  useEffect(() => {
    syncActivityFromDB(500).then(all => {
      setLog(isLead ? all : all.filter(a => a.userId === session?.id));
    });
  }, []);

  const today = new Date().toDateString();
  const todayLog = log.filter(a => new Date(a.timestamp).toDateString() === today);

  const filtered = log.filter(a => {
    const q = search.toLowerCase();
    if (q && ![a.userName,a.action,a.entityType,a.entityName,a.extra||''].join(' ').toLowerCase().includes(q)) return false;
    if (filterAction && a.action !== filterAction) return false;
    if (filterEntity && a.entityType !== filterEntity) return false;
    return true;
  });
  const total = filtered.length;
  const pages = Math.ceil(total/PAGE);
  const rows = filtered.slice((page-1)*PAGE, page*PAGE);

  function exportLog() {
    if (!canExport()) return;
    const r=getActivityLog(500).map(a=>({Time:formatDateTime(a.timestamp),Member:a.userName,Action:a.action,Type:a.entityType,Details:a.entityName,Extra:a.extra||''}));
    const csv=[Object.keys(r[0]).join(','),...r.map(x=>Object.values(x).map(v=>`"${v}"`).join(','))].join('\n');
    const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(csv);a.download='VL_ActivityLog.csv';a.click();
    logActivity('Exported','Activity Log','All activity');
  }
  function exportAll(type) {
    if (!canExport()) return;
    let d, name;
    if (type==='colleges') { d=CollegeDB.all().map(c=>({Name:c.name,City:c.city,State:c.state,Zone:c.zone,NAAC:c.naacGrade,Status:c.status})); name='Colleges'; }
    if (type==='influencers') { d=InfluencerDB.all().map(i=>({Name:i.name,Tier:i.tier,Followers:i.followers,Status:i.status})); name='Influencers'; }
    if (type==='vendors') { d=VendorDB.all().map(v=>({Name:v.name,Zone:v.zone,Category:v.category,Status:v.status})); name='Vendors'; }
    if (!d||!d.length) return;
    const csv=[Object.keys(d[0]).join(','),...d.map(x=>Object.values(x).map(v=>`"${v||''}"`).join(','))].join('\n');
    const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(csv);a.download=`VL_${name}.csv`;a.click();
    logActivity('Exported',name,`All ${name.toLowerCase()}`);
  }

  // By user today
  const todayByUser = todayLog.reduce((acc,a)=>{
    if (!acc[a.userName]) acc[a.userName]=[];
    acc[a.userName].push(a); return acc;
  },{});

  const kpis = [
    {label:'All Time Actions',value:log.length,c:'#2563eb',bg:'#eff6ff'},
    {label:'Today\'s Actions',value:todayLog.length,c:'#10b981',bg:'#ecfdf5'},
    {label:'Records Added',value:log.filter(a=>a.action==='Added'||a.action==='Created').length,c:'#f59e0b',bg:'#fffbeb'},
    {label:'Records Deleted',value:log.filter(a=>a.action==='Deleted').length,c:'#ef4444',bg:'#fef2f2'},
    {label:'Data Exports',value:log.filter(a=>a.action==='Exported').length,c:'#8b5cf6',bg:'#f5f3ff'},
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Reports & Activity Log</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM &rsaquo; Reports</div>
        </div>
        <div className="page-header-right">
          {canExport() ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={exportLog}><Download size={12}/> Activity Log</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>exportAll('colleges')}><Download size={12}/> Colleges</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>exportAll('influencers')}><Download size={12}/> Influencers</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>exportAll('vendors')}><Download size={12}/> Vendors</button>
            </>
          ) : (
            <span style={{fontSize:'.76rem',color:'var(--text-3)',display:'flex',alignItems:'center',gap:5}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Export restricted — contact admin
            </span>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
          {kpis.map(k=>(
            <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
              <div className="kpi-icon" style={{background:k.bg}}><FileBarChart size={16} color={k.c}/></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Today Summary */}
        {todayLog.length>0&&(
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <div><div className="card-title">Today's Activity Summary</div><div className="card-subtitle">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long'})}</div></div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {Object.entries(todayByUser).map(([name,acts])=>(
                  <span key={name} className="badge badge-blue">{name}: {acts.length}</span>
                ))}
              </div>
            </div>
            <div className="card-body">
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:10}}>
                {Object.entries(todayByUser).map(([name,acts])=>(
                  <div key={name} style={{background:'var(--bg)',borderRadius:'var(--r-sm)',padding:12,border:'1px solid var(--border)'}}>
                    <div style={{fontWeight:700,fontSize:'.85rem',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                      <div className="avatar avatar-sm">{name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                      {name}
                    </div>
                    {acts.map((a,i)=>(
                      <div key={i} style={{fontSize:'.74rem',color:'var(--text-2)',padding:'2px 0',borderBottom:'1px solid var(--border)',lineHeight:1.5}}>
                        <span style={{fontWeight:600,color:'var(--text)'}}>{a.action}</span> {a.entityType}: {a.entityName}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full Log */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Full Activity Log</div><div className="card-subtitle">Complete audit trail</div></div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <div className="search-wrap" style={{maxWidth:240}}>
                <Activity size={13}/>
                <input placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
              </div>
              <select className="select" style={{width:'auto'}} value={filterAction} onChange={e=>{setFilterAction(e.target.value);setPage(1);}}>
                <option value="">All Actions</option>
                {['Added','Updated','Deleted','Exported','Approved','Rejected','Created','Submitted','Moved'].map(a=><option key={a}>{a}</option>)}
              </select>
              <select className="select" style={{width:'auto'}} value={filterEntity} onChange={e=>{setFilterEntity(e.target.value);setPage(1);}}>
                <option value="">All Types</option>
                {['College','Influencer','Vendor','Task','Reimbursement','User','Revenue','Budget'].map(e=><option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>Team Member</th><th>Action</th><th>Type</th><th>Details</th><th>Extra</th></tr></thead>
              <tbody>
                {rows.map(a=>{
                  const Icon=ENTITY_ICONS[a.entityType]||Activity;
                  const bg=ENTITY_COLORS[a.entityType]||'#f3f4f6';
                  return (
                    <tr key={a.id}>
                      <td style={{fontSize:'.74rem',color:'var(--text-3)',whiteSpace:'nowrap'}}>
                        <div>{formatDateTime(a.timestamp)}</div>
                        <div style={{fontSize:'.65rem'}}>{timeAgo(a.timestamp)}</div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div className="avatar avatar-sm">{a.userName.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                          <span style={{fontWeight:600,fontSize:'.82rem'}}>{a.userName}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${ACT_BADGE[a.action]||'badge-gray'}`}>{a.action}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:22,height:22,background:bg,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={11} color="var(--text-2)"/></div>
                          <span style={{fontSize:'.8rem'}}>{a.entityType}</span>
                        </div>
                      </td>
                      <td style={{fontWeight:500,fontSize:'.82rem'}}>{a.entityName||'—'}</td>
                      <td style={{fontSize:'.75rem',color:'var(--text-3)'}}>{a.extra||'—'}</td>
                    </tr>
                  );
                })}
                {!rows.length&&<tr><td colSpan={6}><div className="empty-state"><Activity size={40} color="var(--border-2)"/><div className="empty-state-title">No activity found</div></div></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>{Math.min((page-1)*PAGE+1,total)}–{Math.min(page*PAGE,total)} of {total} entries</span>
            <div className="page-btns">
              <button className="page-btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=><button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>)}
              <button className="page-btn" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
