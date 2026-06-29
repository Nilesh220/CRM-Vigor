import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import AIImportModal from '../../components/ui/AIImportModal';
import { useToast, useSession } from '../../contexts/AppContext';
import {
  CollegeDB, ZONES, CONTACT_TYPES, genId, logActivity, exportToCSV,
  searchFilter, paginate, formatDate, canExport, getZoneColor
} from '../../lib/data';
import {
  Plus, Search, Download, School, Phone, Mail, Globe, MapPin,
  Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Filter, X, Check, Sparkles
} from 'lucide-react';


const NAAC = ['A++','A+','A','B++','B+','B','C','Not Accredited'];
const TYPES = ['Government','Private','Autonomous','Deemed','Central University'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_OPTS = ['Active','Prospect','Cold','Inactive'];
const STATUS_COLORS = { Active:'badge-green', Prospect:'badge-yellow', Cold:'badge-blue', Inactive:'badge-gray' };
const TABS = ['Basic Info','Fest Details','Contacts'];

function emptyCollege() {
  return {
    name:'',city:'',state:'',location:'',zone:'',naacGrade:'',affiliation:'',
    type:'',totalStudents:'',website:'',status:'Active',
    nccUnit:false,eCell:false,placementCell:false,
    festName:'',festMonth:'',festBudget:'',festFootfall:'',festNotes:'',
    contacts:[],
  };
}

export default function Colleges() {
  const toast = useToast();
  const session = useSession();
  const [sp] = useSearchParams();
  const [data, setData] = useState(() => CollegeDB.all());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState(sp.get('zone')||'');
  const [filterNAAC, setFilterNAAC] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 15;

  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyCollege());
  const [tab, setTab] = useState(0);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    CollegeDB.syncFromDB().then(rows => setData(rows));
  }, []);

  const refresh = () => setData(CollegeDB.all());

  const filtered = (() => {
    let d = data;
    if (search) d = searchFilter(d, search, ['name','city','state','naacGrade','affiliation','festName']);
    if (filterZone) d = d.filter(c => c.zone === filterZone);
    if (filterNAAC) d = d.filter(c => c.naacGrade === filterNAAC);
    if (filterStatus) d = d.filter(c => c.status === filterStatus);
    return d;
  })();
  const { data: rows, total, pages } = paginate(filtered, page, PAGE);

  function openAdd() {
    setEditId(null); setForm(emptyCollege()); setContacts([]); setTab(0); setModal(true);
  }
  function openEdit(c) {
    setEditId(c.id);
    setForm({...emptyCollege(),...c});
    setContacts(JSON.parse(JSON.stringify(c.contacts||[])));
    setTab(0); setModal(true);
  }
  function openView(c) { setViewing(c); setViewModal(true); }

  function addContact() {
    setContacts(prev => [...prev, { type:'', name:'', phone:'', email:'', designation:'' }]);
  }
  function updateContact(i, field, val) {
    setContacts(prev => { const a=[...prev]; a[i]={...a[i],[field]:val}; return a; });
  }
  function removeContact(i) { setContacts(prev => prev.filter((_,idx)=>idx!==i)); }

  async function save() {
    if (!form.name.trim()||!form.city.trim()||!form.state.trim()) {
      toast('Name, city and state are required.', 'warning'); setTab(0); return;
    }
    setLoading(true);
    const payload = { ...form, contacts };
    if (editId) {
      await CollegeDB.update(editId, payload);
      logActivity('Updated','College',form.name,`${contacts.length} contacts`);
      toast('College updated!','success');
    } else {
      payload.id = genId('col'); payload.createdBy = session?.id; payload.createdAt = new Date().toISOString();
      await CollegeDB.add(payload);
      logActivity('Added','College',form.name,form.zone ? `${ZONES[form.zone]?.label}` : '');
      toast('College added!','success');
    }
    setLoading(false);
    setModal(false); refresh();
  }

  async function del(id) {
    const c = CollegeDB.get(id);
    if (!confirm(`Delete "${c?.name}"? This cannot be undone.`)) return;
    await CollegeDB.remove(id); logActivity('Deleted','College',c?.name||id);
    toast('College deleted.','success'); refresh();
  }

  function exportCSV() {
    if (!canExport()) { toast('Export access denied.','error'); return; }
    exportToCSV(CollegeDB.all(), 'VL_Colleges.csv', {
      name:'Name', city:'City', state:'State', zone:'Zone', naacGrade:'NAAC',
      affiliation:'Affiliation', type:'Type', status:'Status',
      festName:'Fest Name', festMonth:'Fest Month',
    });
    logActivity('Exported','College','All colleges');
  }

  const kpiData = [
    { label:'Total', value:data.length, c:'#2563eb', bg:'#eff6ff' },
    { label:'Active', value:data.filter(c=>c.status==='Active').length, c:'#10b981', bg:'#ecfdf5' },
    { label:'Prospects', value:data.filter(c=>c.status==='Prospect').length, c:'#f59e0b', bg:'#fffbeb' },
    { label:'Contacts', value:data.reduce((s,c)=>(s+(c.contacts||[]).length),0), c:'#ef4444', bg:'#fef2f2' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">College Database</div>
          <div className="page-breadcrumb">VigorSpace &rsaquo; Colleges</div>
        </div>
        <div className="page-header-right">
          {canExport() && <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={13}/> Export</button>}
          <button className="btn btn-ai btn-sm" onClick={() => setAiModal(true)}>
            <Sparkles size={13} /> AI Import
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add College</button>
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))'}}>
          {kpiData.map(k=>(
            <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
              <div className="kpi-icon" style={{background:k.bg}}><School size={16} color={k.c}/></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div className="filter-row" style={{margin:0,flex:1}}>
              <div className="search-wrap" style={{flex:'0 1 280px'}}>
                <Search size={14}/><input placeholder="Search colleges, cities, fests…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
                {search && <button onClick={()=>{setSearch('');setPage(1);}} style={{color:'var(--text-3)'}}><X size={12}/></button>}
              </div>
              <select className="select" style={{width:'auto'}} value={filterZone} onChange={e=>{setFilterZone(e.target.value);setPage(1);}}>
                <option value="">All Zones</option>
                {Object.values(ZONES).map(z=><option key={z.key} value={z.key}>{z.label}</option>)}
              </select>
              <select className="select" style={{width:'auto'}} value={filterNAAC} onChange={e=>{setFilterNAAC(e.target.value);setPage(1);}}>
                <option value="">All NAAC</option>
                {NAAC.map(n=><option key={n}>{n}</option>)}
              </select>
              <select className="select" style={{width:'auto'}} value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>College</th><th>Zone</th><th>City/State</th><th>NAAC</th>
                  <th>Fest</th><th>Contacts</th><th>NCC</th><th>E-Cell</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map(c=>(
                  <tr key={c.id}>
                    <td>
                      <div className="cell-primary">{c.name}</div>
                      <div className="cell-sub">{c.affiliation||'—'}</div>
                    </td>
                    <td>
                      {c.zone && (
                        <span style={{fontSize:'.7rem',fontWeight:700,color:getZoneColor(c.zone),background:`${getZoneColor(c.zone)}18`,padding:'2px 8px',borderRadius:'99px'}}>
                          {ZONES[c.zone]?.label.replace(' Zone','')}
                        </span>
                      )}
                    </td>
                    <td><div style={{fontSize:'.82rem'}}>{c.city}</div><div className="cell-sub">{c.state}</div></td>
                    <td>{c.naacGrade ? <span className="badge badge-blue">{c.naacGrade}</span> : '—'}</td>
                    <td>
                      {c.festName ? <><div style={{fontSize:'.82rem',fontWeight:600}}>{c.festName}</div><div className="cell-sub">{c.festMonth}</div></> : '—'}
                    </td>
                    <td><span className="badge badge-purple">{(c.contacts||[]).length}</span></td>
                    <td>{c.nccUnit ? <Check size={14} color="var(--success)"/> : <span style={{color:'var(--border-2)'}}>—</span>}</td>
                    <td>{c.eCell ? <Check size={14} color="var(--success)"/> : <span style={{color:'var(--border-2)'}}>—</span>}</td>
                    <td><span className={`badge ${STATUS_COLORS[c.status]||'badge-gray'}`}>{c.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" title="View" onClick={()=>openView(c)}><Eye size={14}/></button>
                        <button className="btn btn-ghost btn-icon" title="Edit" onClick={()=>openEdit(c)}><Edit2 size={14}/></button>
                        <button className="btn btn-ghost btn-icon" title="Delete" style={{color:'var(--danger)'}} onClick={()=>del(c.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <School size={40} color="var(--border-2)"/>
                      <div className="empty-state-title">No colleges found</div>
                      <div className="empty-state-text">Try adjusting filters or add a new college.</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>{Math.min((page-1)*PAGE+1,total)}–{Math.min(page*PAGE,total)} of {total}</span>
            <div className="page-btns">
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={12}/></button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=>(
                <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page===pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={12}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit College':'Add College'} size="modal-xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save College</button>
          </>
        }>
        <div className="tabs">
          {TABS.map((t,i)=><button key={t} className={`tab-btn ${tab===i?'active':''}`} onClick={()=>setTab(i)}>{t}</button>)}
        </div>

        {/* Basic Info */}
        {tab===0 && (
          <>
            <div className="form-row">
              <div className="form-group"><label className="form-label">College Name <span className="req">*</span></label>
                <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Symbiosis Institute of Technology"/></div>
              <div className="form-group"><label className="form-label">City <span className="req">*</span></label>
                <input className="input" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="e.g., Pune"/></div>
              <div className="form-group"><label className="form-label">State <span className="req">*</span></label>
                <input className="input" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} placeholder="e.g., Maharashtra"/></div>
              <div className="form-group"><label className="form-label">Zone</label>
                <select className="select" value={form.zone} onChange={e=>setForm(f=>({...f,zone:e.target.value}))}>
                  <option value="">Select Zone</option>
                  {Object.values(ZONES).map(z=><option key={z.key} value={z.key}>{z.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">NAAC Grade</label>
                <select className="select" value={form.naacGrade} onChange={e=>setForm(f=>({...f,naacGrade:e.target.value}))}>
                  <option value="">Select</option>{NAAC.map(n=><option key={n}>{n}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Affiliation / University</label>
                <input className="input" value={form.affiliation} onChange={e=>setForm(f=>({...f,affiliation:e.target.value}))} placeholder="e.g., Pune University"/></div>
              <div className="form-group"><label className="form-label">College Type</label>
                <select className="select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="">Select</option>{TYPES.map(t=><option key={t}>{t}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Total Students</label>
                <input className="input" type="number" value={form.totalStudents} onChange={e=>setForm(f=>({...f,totalStudents:e.target.value}))} placeholder="e.g., 5000"/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Website</label>
                <input className="input" value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="www.college.edu"/></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
                </select></div>
            </div>

          </>
        )}

        {/* Fest Details */}
        {tab===1 && (
          <>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Fest Name</label>
                <input className="input" value={form.festName} onChange={e=>setForm(f=>({...f,festName:e.target.value}))} placeholder="e.g., TECHSYM"/></div>
              <div className="form-group"><label className="form-label">Fest Month</label>
                <select className="select" value={form.festMonth} onChange={e=>setForm(f=>({...f,festMonth:e.target.value}))}>
                  <option value="">Select Month</option>{MONTHS.map(m=><option key={m}>{m}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Est. Budget</label>
                <input className="input" value={form.festBudget} onChange={e=>setForm(f=>({...f,festBudget:e.target.value}))} placeholder="e.g., ₹15,00,000"/></div>
              <div className="form-group"><label className="form-label">Expected Footfall</label>
                <input className="input" value={form.festFootfall} onChange={e=>setForm(f=>({...f,festFootfall:e.target.value}))} placeholder="e.g., 10,000"/></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label>
              <textarea className="textarea" value={form.festNotes} onChange={e=>setForm(f=>({...f,festNotes:e.target.value}))} placeholder="Additional notes about the fest…"/></div>
          </>
        )}

        {/* Contacts */}
        {tab===2 && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:'.8rem',color:'var(--text-2)'}}>Add contacts progressively as you discover them</span>
              <button className="btn btn-secondary btn-sm" onClick={addContact}><Plus size={12}/> Add Contact</button>
            </div>
            {contacts.length ? contacts.map((c,i)=>(
              <div key={i} style={{background:'var(--bg)',borderRadius:'var(--r-sm)',padding:14,marginBottom:10,border:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <select className="select" style={{width:200}} value={c.type} onChange={e=>updateContact(i,'type',e.target.value)}>
                    <option value="">Contact Type</option>
                    {CONTACT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeContact(i)}><X size={13}/> Remove</button>
                </div>
                <div className="form-row" style={{gridTemplateColumns:'repeat(4,1fr)',gap:8,margin:0}}>
                  {[['name','Full Name'],['phone','Phone'],['email','Email'],['designation','Designation']].map(([f,pl])=>(
                    <input key={f} className="input" placeholder={pl} value={c[f]} onChange={e=>updateContact(i,f,e.target.value)}/>
                  ))}
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{padding:'30px 0'}}>
                <Phone size={32} color="var(--border-2)"/>
                <div className="empty-state-title">No contacts yet</div>
                <div className="empty-state-text">Click "Add Contact" to start building the contact list</div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* VIEW MODAL */}
      {viewing && (
        <Modal open={viewModal} onClose={()=>setViewModal(false)} title={viewing.name} size="modal-xl"
          footer={
            <>
              <button className="btn btn-secondary" onClick={()=>setViewModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={()=>{setViewModal(false);openEdit(viewing);}}>Edit College</button>
            </>
          }>
          <div className="grid-2" style={{marginBottom:18}}>
            <div>
              <div className="section-title">Basic Information</div>
              {[['City',viewing.city],['State',viewing.state],['NAAC',viewing.naacGrade],['Zone',ZONES[viewing.zone]?.label],
                ['Affiliation',viewing.affiliation],['Type',viewing.type],['Students',viewing.totalStudents],
                ['Status',viewing.status]].map(([k,v])=>v?(
                  <div key={k} className="info-row"><strong style={{width:90,flexShrink:0,color:'var(--text-3)',fontWeight:500}}>{k}</strong>{v}</div>
                ):null)}

            </div>
            <div>
              {viewing.festName && (
                <>
                  <div className="section-title">Fest Details</div>
                  <div style={{background:`${getZoneColor(viewing.zone)||'#2563eb'}0D`,border:`1px solid ${getZoneColor(viewing.zone)||'#2563eb'}30`,borderRadius:'var(--r-sm)',padding:14}}>
                    <div style={{fontWeight:800,fontSize:'1rem',marginBottom:8}}>{viewing.festName}</div>
                    {[['Month',viewing.festMonth],['Budget',viewing.festBudget],['Footfall',viewing.festFootfall]].map(([k,v])=>v?(
                      <div key={k} style={{fontSize:'.8rem',color:'var(--text-2)',marginBottom:3}}>{k}: <strong>{v}</strong></div>
                    ):null)}
                  </div>
                </>
              )}
            </div>
          </div>
          {(viewing.contacts||[]).length > 0 && (
            <>
              <div className="divider"/>
              <div className="section-title">Contacts ({viewing.contacts.length})</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
                {viewing.contacts.map((c,i)=>(
                  <div key={i} className="contact-card-item">
                    <div className="contact-type-label">{c.type||'Contact'}</div>
                    {c.name && <div className="info-row"><Globe size={11}/>{c.name}{c.designation?` — ${c.designation}`:''}</div>}
                    {c.phone && <div className="info-row"><Phone size={11}/>{c.phone}</div>}
                    {c.email && <div className="info-row"><Mail size={11}/>{c.email}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
      <AIImportModal open={aiModal} onClose={() => setAiModal(false)} entityType="college" onImported={refresh} />
    </div>
  );
}
