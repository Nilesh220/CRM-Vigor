import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import AIImportModal from '../../components/ui/AIImportModal';
import ImportCSVModal from '../../components/ui/ImportCSVModal';
import { useToast, useSession } from '../../contexts/AppContext';
import { VendorDB, ZONES, genId, logActivity, searchFilter, paginate, canExport, getZoneColor, exportToCSV } from '../../lib/data';
import { Plus, Search, Download, Handshake, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, X, Check, Sparkles, Linkedin, Globe, Clock, Upload } from 'lucide-react';

const CATS = ['Fabrication','Event Management','Printing','On-Ground Activation','Photography/Video','Logistics','Catering','AV Equipment','Other'];
const REGIONS = ['North','South','East','West','Central'];
const FAB_OPTS = ['Yes - in house','Yes - outsourced','No'];
const STATUS_OPTS = ['Active','Inactive','Pending'];
const STATUS_COLORS = { Active:'badge-green', Inactive:'badge-gray', Pending:'badge-yellow' };

function emptyVendor() {
  return { name:'',companyName:'',contactNumber:'',email:'',linkedinProfile:'',website:'',city:'',region:'',zone:'',
    category:'',manPower:'',promoterCost:'',fabrication:'No',schoolPermission:false,collegePermission:false,status:'Active',comment:'' };
}

export default function Vendors() {
  const toast = useToast();
  const session = useSession();
  const [sp] = useSearchParams();
  const [data, setData] = useState(()=>VendorDB.all());
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState(sp.get('zone')||'');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 15;

  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyVendor());

  useEffect(() => {
    VendorDB.syncFromDB().then(rows => setData(rows));
  }, []);

  const refresh = () => setData(VendorDB.all());

  const filtered = (() => {
    let d = data;
    // P4: vigorspace team members see only their own entries
    if (session?.role === 'vigorspace') {
      d = d.filter(v => v.createdBy === session.id);
    }
    if (search) d = searchFilter(d, search, ['name','companyName','city','email','region','category']);
    if (filterZone) d = d.filter(v=>v.zone===filterZone);
    if (filterStatus) d = d.filter(v=>v.status===filterStatus);
    if (filterCat) d = d.filter(v=>v.category===filterCat);
    return d;
  })();
  const { data:rows, total, pages } = paginate(filtered, page, PAGE);

  function openAdd() { setEditId(null); setForm(emptyVendor()); setModal(true); }
  function openEdit(v) { setEditId(v.id); setForm({...emptyVendor(),...v}); setModal(true); }
  function openView(v) { setViewing(v); setViewModal(true); }

  async function save() {
    if (!form.name.trim()) { toast('Vendor name required.','warning'); return; }
    const payload = {...form};
    if (editId) {
      await VendorDB.update(editId, payload);
      logActivity('Updated','Vendor',form.name);
      toast('Vendor updated!','success');
    } else {
      payload.id = genId('ven'); payload.createdBy=session?.id; payload.createdAt=new Date().toISOString();
      await VendorDB.add(payload);
      logActivity('Added','Vendor',form.name,form.zone?ZONES[form.zone]?.label:'');
      toast('Vendor added!','success');
    }
    setModal(false); refresh();
  }
  async function del(id) {
    const v=VendorDB.get(id);
    if (!confirm(`Delete "${v?.name}"?`)) return;
    await VendorDB.remove(id); logActivity('Deleted','Vendor',v?.name||id);
    toast('Vendor deleted.','success'); refresh();
  }
  async function handleCSVImport(rows) {
    const items = rows.map(r => ({
      ...emptyVendor(), id: genId('ven'), createdBy: session?.id, createdAt: new Date().toISOString(),
      name: r.name || '', companyName: r.companyName || '', contactNumber: r.contactNumber || '',
      email: r.email || '', city: r.city || '', zone: r.zone || '', region: r.region || '',
      category: r.category || '', status: r.status || 'Active', comment: r.comment || '',
      linkedinProfile: r.linkedinProfile || '', website: r.website || ''
    }));
    await VendorDB.bulkAdd(items);
    logActivity('Imported', 'Vendor', `${items.length} vendors via CSV`);
    refresh();
  }

  function exportCSV() {
    if (!canExport()) { toast('Export access denied.','error'); return; }
    exportToCSV(VendorDB.all(), 'VL_Vendors.csv', {
      name:'Name', companyName:'Company', zone:'Zone', category:'Category',
      city:'City', region:'Region', status:'Status', contactNumber:'Contact', manPower:'Man Power'
    });
  }

  const kpis = [
    {label:'Total',value:data.length,c:'#2563eb',bg:'#eff6ff'},
    {label:'Active',value:data.filter(v=>v.status==='Active').length,c:'#10b981',bg:'#ecfdf5'},
    {label:'Pending',value:data.filter(v=>v.status==='Pending').length,c:'#f59e0b',bg:'#fffbeb'},
    {label:'College Access',value:data.filter(v=>v.collegePermission).length,c:'#8b5cf6',bg:'#f5f3ff'},
    {label:'School Access',value:data.filter(v=>v.schoolPermission).length,c:'#0ea5e9',bg:'#f0f9ff'},
    {label:'Zones Covered',value:[...new Set(data.map(v=>v.zone).filter(Boolean))].length||0,c:'#ef4444',bg:'#fef2f2'},
  ].map(k=>({...k, value:k.value||([...new Set(data.map(v=>v.zone).filter(Boolean))].length)}));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Vendor Database</div>
          <div className="page-breadcrumb">VigorSpace &rsaquo; Vendors</div>
        </div>
        <div className="page-header-right">
          {canExport()&&<button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={13}/> Export</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => setCsvModal(true)}><Upload size={13}/> Import CSV</button>
          <button className="btn btn-ai btn-sm" onClick={() => setAiModal(true)}>
            <Sparkles size={13} /> AI Import
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Vendor</button>
        </div>
      </div>
      <div className="page-body">
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))'}}>
          {kpis.map(k=>(
            <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
              <div className="kpi-icon" style={{background:k.bg}}><Handshake size={16} color={k.c}/></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="filter-row" style={{margin:0,flex:1}}>
              <div className="search-wrap" style={{flex:'0 1 280px'}}>
                <Search size={14}/><input placeholder="Search vendors, city, company…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
                {search&&<button onClick={()=>{setSearch('');setPage(1);}}><X size={12}/></button>}
              </div>
              {[
                {val:filterZone,set:setFilterZone,opts:Object.values(ZONES).map(z=>({v:z.key,l:z.label})),pl:'All Zones'},
                {val:filterStatus,set:setFilterStatus,opts:STATUS_OPTS.map(s=>({v:s,l:s})),pl:'All Status'},
                {val:filterCat,set:setFilterCat,opts:CATS.map(c=>({v:c,l:c})),pl:'All Categories'},
              ].map((f,i)=>(
                <select key={i} className="select" style={{width:'auto'}} value={f.val} onChange={e=>{f.set(e.target.value);setPage(1);}}>
                  <option value="">{f.pl}</option>
                  {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ))}
            </div>
          </div>
          <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
            <table className="data-table">
              <thead>
                <tr><th>Vendor</th><th>Zone</th><th>City/Region</th><th>Category</th><th>Contact</th><th>Man Power</th><th>College</th><th>School</th><th>Cost/Day</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length ? rows.map(v=>(
                  <tr key={v.id}>
                    <td><div className="cell-primary">{v.name}</div><div className="cell-sub">{v.companyName}</div></td>
                    <td>{v.zone&&<span style={{fontSize:'.7rem',fontWeight:700,color:getZoneColor(v.zone),background:`${getZoneColor(v.zone)}18`,padding:'2px 8px',borderRadius:'99px'}}>{ZONES[v.zone]?.label.replace(' Zone','')}</span>}</td>
                    <td><div style={{fontSize:'.82rem'}}>{v.region}</div><div className="cell-sub">{v.city}</div></td>
                    <td>{v.category?<span className="chip">{v.category}</span>:'—'}</td>
                    <td style={{fontSize:'.8rem'}}>{v.contactNumber||'—'}</td>
                    <td style={{fontWeight:600}}>{v.manPower||0}</td>
                    <td>{v.collegePermission?<Check size={14} color="var(--success)"/>:<span style={{color:'var(--border-2)'}}>—</span>}</td>
                    <td>{v.schoolPermission?<Check size={14} color="var(--success)"/>:<span style={{color:'var(--border-2)'}}>—</span>}</td>
                    <td style={{fontSize:'.78rem'}}>{v.promoterCost||'—'}</td>
                    <td><span className={`badge ${STATUS_COLORS[v.status]||'badge-gray'}`}>{v.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={()=>openView(v)}><Eye size={14}/></button>
                        <button className="btn btn-ghost btn-icon" onClick={()=>openEdit(v)}><Edit2 size={14}/></button>
                        <button className="btn btn-ghost btn-icon" style={{color:'var(--danger)'}} onClick={()=>del(v.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )):(
                  <tr><td colSpan={11}><div className="empty-state"><Handshake size={40} color="var(--border-2)"/><div className="empty-state-title">No vendors found</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>{Math.min((page-1)*PAGE+1,total)}–{Math.min(page*PAGE,total)} of {total}</span>
            <div className="page-btns">
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={12}/></button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=><button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>)}
              <button className="page-btn" disabled={page===pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={12}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Vendor':'Add Vendor'} size="modal-xl"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Vendor</button></>}>
        <div className="form-row">
          {[['name','Vendor Name *','text','e.g., StarPrint Solutions'],['companyName','Company Name','text','Company / Agency'],['contactNumber','Phone','text','10-digit mobile'],['email','Email','email','email@company.com']].map(([k,l,t,pl])=>(
            <div key={k} className="form-group"><label className="form-label">{l}</label><input className="input" type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={pl}/></div>
          ))}
        </div>
        <div className="form-row">
          {[['linkedinProfile','LinkedIn','text','linkedin.com/company/…'],['website','Website','text','www.company.com'],['city','City','text','City']].map(([k,l,t,pl])=>(
            <div key={k} className="form-group"><label className="form-label">{l}</label><input className="input" type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={pl}/></div>
          ))}
          <div className="form-group"><label className="form-label">Zone</label>
            <select className="select" value={form.zone} onChange={e=>setForm(f=>({...f,zone:e.target.value}))}>
              <option value="">Select Zone</option>{Object.values(ZONES).map(z=><option key={z.key} value={z.key}>{z.label}</option>)}
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Region</label>
            <select className="select" value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))}>
              <option value="">Select</option>{REGIONS.map(r=><option key={r}>{r}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              <option value="">Select</option>{CATS.map(c=><option key={c}>{c}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Man Power</label>
            <input className="input" type="number" value={form.manPower||''} onChange={e=>setForm(f=>({...f,manPower:e.target.value}))} placeholder="e.g., 50"/></div>
          <div className="form-group"><label className="form-label">Promoter Cost</label>
            <input className="input" value={form.promoterCost||''} onChange={e=>setForm(f=>({...f,promoterCost:e.target.value}))} placeholder="e.g., ₹800/day"/></div>
        </div>
        <div className="form-row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
          <div className="form-group"><label className="form-label">Fabrication</label>
            <select className="select" value={form.fabrication} onChange={e=>setForm(f=>({...f,fabrication:e.target.value}))}>
              {FAB_OPTS.map(o=><option key={o}>{o}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
            </select></div>
          <div className="form-group" style={{display:'flex',flexDirection:'column',gap:8,paddingTop:20}}>
            <label className="checkbox-label"><input type="checkbox" checked={form.collegePermission} onChange={e=>setForm(f=>({...f,collegePermission:e.target.checked}))}/> College Permission</label>
            <label className="checkbox-label"><input type="checkbox" checked={form.schoolPermission} onChange={e=>setForm(f=>({...f,schoolPermission:e.target.checked}))}/> School Permission</label>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Notes</label>
          <textarea className="textarea" value={form.comment||''} onChange={e=>setForm(f=>({...f,comment:e.target.value}))} placeholder="Remarks about this vendor…"/></div>
      </Modal>

      {/* VIEW MODAL */}
      {viewing&&<Modal open={viewModal} onClose={()=>setViewModal(false)} title={viewing.name} size="modal-lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setViewModal(false)}>Close</button><button className="btn btn-primary" onClick={()=>{setViewModal(false);openEdit(viewing);}}>Edit</button></>}>
        <div className="grid-2">
          <div>
            {[['Company',viewing.companyName],['Email',viewing.email],['Phone',viewing.contactNumber],['City',viewing.city],['Region',viewing.region],['Zone',ZONES[viewing.zone]?.label],['Category',viewing.category],['Status',viewing.status]].map(([k,v])=>v?<div key={k} className="info-row"><strong style={{width:80,color:'var(--text-3)',fontWeight:500,flexShrink:0}}>{k}</strong>{v}</div>:null)}
            {/* Social/Web Links */}
            <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
              {viewing.linkedinProfile && (
                <a href={viewing.linkedinProfile.startsWith('http')?viewing.linkedinProfile:`https://${viewing.linkedinProfile}`} target="_blank" rel="noreferrer"
                  className="btn btn-sm btn-secondary" style={{display:'flex',alignItems:'center',gap:5,color:'#0a66c2',textDecoration:'none'}}>
                  <Linkedin size={13}/> LinkedIn
                </a>
              )}
              {viewing.website && (
                <a href={viewing.website.startsWith('http')?viewing.website:`https://${viewing.website}`} target="_blank" rel="noreferrer"
                  className="btn btn-sm btn-secondary" style={{display:'flex',alignItems:'center',gap:5,textDecoration:'none'}}>
                  <Globe size={13}/> Website
                </a>
              )}
            </div>
            {/* Date Modified */}
            <div style={{display:'flex',gap:12,marginTop:10,fontSize:'.73rem',color:'var(--text-3)'}}>
              {viewing.createdAt&&<span><Clock size={10} style={{marginRight:3}}/>Added: {new Date(viewing.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
              {viewing.updatedAt&&<span><Clock size={10} style={{marginRight:3}}/>Edited: {new Date(viewing.updatedAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
            </div>
          </div>
          <div>
            <div style={{background:'var(--bg)',borderRadius:'var(--r-sm)',padding:14,marginBottom:12}}>
              <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Capabilities</div>
              {[['Man Power',viewing.manPower+' people'],['Promoter Cost',viewing.promoterCost],['Fabrication',viewing.fabrication]].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',padding:'4px 0',borderBottom:'1px solid var(--border)'}}><span style={{color:'var(--text-2)'}}>{k}</span><strong>{v||'—'}</strong></div>)}
              <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                {viewing.collegePermission&&<span className="chip active">College Access</span>}
                {viewing.schoolPermission&&<span className="chip active">School Access</span>}
              </div>
            </div>
            {viewing.comment&&<div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'var(--r-sm)',padding:12,fontSize:'.82rem'}}><strong>Notes:</strong> {viewing.comment}</div>}
          </div>
        </div>
      </Modal>}
      <AIImportModal open={aiModal} onClose={() => setAiModal(false)} entityType="vendor" onImported={refresh} />
      <ImportCSVModal
        open={csvModal} onClose={() => setCsvModal(false)} title="Import Vendors from CSV/Excel"
        columns={[
          { key: 'name', label: 'Vendor Name', required: true },
          { key: 'companyName', label: 'Company Name' }, { key: 'contactNumber', label: 'Phone' },
          { key: 'email', label: 'Email' }, { key: 'city', label: 'City' },
          { key: 'zone', label: 'Zone' }, { key: 'region', label: 'Region' },
          { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' },
          { key: 'linkedinProfile', label: 'LinkedIn' }, { key: 'website', label: 'Website' },
          { key: 'comment', label: 'Notes' },
        ]}
        onImport={handleCSVImport}
      />
    </div>
  );
}
