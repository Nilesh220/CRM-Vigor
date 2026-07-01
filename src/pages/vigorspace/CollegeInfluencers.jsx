import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import MaskedContact from '../../components/ui/MaskedContact';
import AIImportModal from '../../components/ui/AIImportModal';
import { useToast, useSession } from '../../contexts/AppContext';
import { InfluencerDB, genId, logActivity, searchFilter, paginate, canExport, getInfluencerTier, formatFollowers, ZONES, getZoneColor, exportToCSV, getUserZones } from '../../lib/data';
import { Plus, Search, Download, Star, Edit2, Trash2, ChevronLeft, ChevronRight, X, Sparkles, ExternalLink, Instagram, Youtube } from 'lucide-react';

const TIER_COLORS = { Nano:'badge-green', Micro:'badge-blue', 'Mid Micro':'badge-teal', Macro:'badge-purple', Mega:'badge-yellow' };
const TIER_RANGES = { Nano:'1K–10K', Micro:'10K–35K', 'Mid Micro':'35K–100K', Macro:'100K–600K', Mega:'600K+' };
const STATUS_COLORS = { Active:'badge-green', Inactive:'badge-gray', 'Pending Outreach':'badge-yellow' };

function emptyCollegeInfluencer() {
  return { name:'',instagramLink:'',gender:'',followers:0,genre:'Campus Ambassador',collegeName:'',city:'',zone:'',
    avgViews:0,erPercent:0,contactNumber:'',contentLanguage:'',youtubeLink:'',status:'Active', type:'college' };
}

export default function CollegeInfluencers() {
  const toast = useToast();
  const session = useSession();
  const [data, setData] = useState(() => InfluencerDB.all().filter(i => i.type === 'college'));
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 20;

  const [modal, setModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyCollegeInfluencer());

  const refresh = () => setData(InfluencerDB.all().filter(i => i.type === 'college'));
  const tier = f => getInfluencerTier(parseInt(f?.followers||0));

  useEffect(() => {
    InfluencerDB.syncFromDB().then(rows => setData(rows.filter(i => i.type === 'college')));
  }, []);

  const filtered = (() => {
    let d = data;
    // Zone-based access: vigorspace members see influencers in their assigned zones
    if (session?.role === 'vigorspace') {
      const userZones = getUserZones(session);
      if (userZones.length > 0) {
        d = d.filter(i => !i.zone || userZones.includes(i.zone));
      }
    }
    if (search) d = searchFilter(d, search, ['name','collegeName','city','genre','contentLanguage']);
    if (filterTier) d = d.filter(i => (i.tier||tier(i)) === filterTier);
    if (filterGender) d = d.filter(i => i.gender === filterGender);
    if (filterStatus) d = d.filter(i => i.status === filterStatus);
    return d;
  })();
  const { data: rows, total, pages } = paginate(filtered, page, PAGE);

  const tierCounts = ['Nano','Micro','Mid Micro','Macro','Mega'].map(t=>({
    t, count: data.filter(i=>(i.tier||tier(i))===t).length,
    range: TIER_RANGES[t]
  }));

  function openAdd() { setEditId(null); setForm(emptyCollegeInfluencer()); setModal(true); }
  function openEdit(inf) { setEditId(inf.id); setForm({ ...emptyCollegeInfluencer(), ...inf }); setModal(true); }

  async function save() {
    if (!form.name.trim()) { toast('Name required.','warning'); return; }
    const payload = {
      ...form,
      type: 'college',
      tier: tier(form),
      followers: parseInt(form.followers)||0,
      avgViews: parseInt(form.avgViews)||0,
      erPercent: parseFloat(form.erPercent)||0
    };
    if (editId) {
      await InfluencerDB.update(editId, payload);
      logActivity('Updated', 'College Influencer', form.name);
      toast('College influencer updated!', 'success');
    } else {
      payload.id = genId('inf');
      payload.createdBy = session?.id;
      payload.createdAt = new Date().toISOString();
      await InfluencerDB.add(payload);
      logActivity('Added', 'College Influencer', form.name, `${formatFollowers(payload.followers)} followers`);
      toast('College influencer added!', 'success');
    }
    setModal(false);
    refresh();
  }

  async function del(id) {
    const inf = InfluencerDB.get(id);
    if (!confirm(`Delete "${inf?.name}"?`)) return;
    await InfluencerDB.remove(id);
    logActivity('Deleted', 'College Influencer', inf?.name||id);
    toast('Deleted.', 'success');
    refresh();
  }

  function exportCSV() {
    if (!canExport()) { toast('Export access denied.', 'error'); return; }
    exportToCSV(data, 'VL_CollegeAmbassadors.csv', {
      name:'Name', instagramLink:'Instagram', gender:'Gender', followers:'Followers',
      tier:'Tier', genre:'Genre', collegeName:'College', city:'City',
      erPercent:'ER%', contactNumber:'Contact', status:'Status'
    });
    logActivity('Exported', 'College Influencer', 'All ambassadors');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">College Influencers (Ambassadors)</div>
          <div className="page-breadcrumb">VigorSpace &rsaquo; College Influencers</div>
        </div>
        <div className="page-header-right">
          {canExport() && <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={13}/> Export</button>}
          <button className="btn btn-ai btn-sm" onClick={() => setAiModal(true)}>
            <Sparkles size={13} /> AI Import
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Ambassador</button>
        </div>
      </div>
      
      <div className="page-body">
        {/* Tier KPI Cards */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {[
            { label: 'Total Ambassadors', value: data.length, c: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Active', value: data.filter(i => i.status === 'Active').length, c: '#10b981', bg: '#ecfdf5' },
            ...tierCounts.map(t => ({
              label: `${t.t} (${t.range})`, value: t.count,
              c: { Nano:'#10b981', Micro:'#3b82f6', 'Mid Micro':'#0ea5e9', Macro:'#8b5cf6', Mega:'#f59e0b' }[t.t],
              bg: { Nano:'#ecfdf5', Micro:'#eff6ff', 'Mid Micro':'#f0f9ff', Macro:'#f5f3ff', Mega:'#fffbeb' }[t.t]
            })),
          ].map(k => (
            <div key={k.label} className="kpi-card" style={{ '--kpi-accent': k.c }}>
              <div className="kpi-icon" style={{ background: k.bg }}><Star size={16} color={k.c} /></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="filter-row" style={{ margin: 0, flex: 1 }}>
              <div className="search-wrap" style={{ flex: '0 1 280px' }}>
                <Search size={14}/>
                <input
                  placeholder="Search name, college, city…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <button onClick={() => { setSearch(''); setPage(1); }}><X size={12}/></button>}
              </div>
              <select className="select" style={{ width: 'auto' }} value={filterTier} onChange={e => { setFilterTier(e.target.value); setPage(1); }}>
                <option value="">All Tiers</option>
                {['Nano','Micro','Mid Micro','Macro','Mega'].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="select" style={{ width: 'auto' }} value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}>
                <option value="">All Genders</option>
                {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
              </select>
              <select className="select" style={{ width: 'auto' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                {['Active','Inactive','Pending Outreach'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Instagram</th><th>Gender</th><th>Followers</th><th>Tier</th><th>College / City</th><th>Avg Views</th><th>ER %</th><th>Contact</th><th>Language</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((inf, idx) => {
                  const t = inf.tier || tier(inf);
                  return (
                    <tr key={inf.id}>
                      <td style={{ color: 'var(--text-3)', fontSize: '.78rem' }}>{(page-1)*PAGE+idx+1}</td>
                      <td><div className="cell-primary">{inf.name}</div></td>
                      <td>
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          {inf.instagramLink ? (
                            <a href={`https://${inf.instagramLink.replace('https://','')}`} target="_blank" rel="noreferrer"
                              title={inf.instagramLink} style={{color:'#e1306c',display:'flex',alignItems:'center'}}>
                              <Instagram size={15}/>
                            </a>
                          ) : null}
                          {inf.youtubeLink ? (
                            <a href={`https://${inf.youtubeLink.replace('https://','')}`} target="_blank" rel="noreferrer"
                              title={inf.youtubeLink} style={{color:'#ff0000',display:'flex',alignItems:'center'}}>
                              <Youtube size={15}/>
                            </a>
                          ) : null}
                          {!inf.instagramLink && !inf.youtubeLink && <span style={{color:'var(--text-3)'}}>—</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{inf.gender||'—'}</td>
                      <td style={{ fontWeight: 700 }}>{formatFollowers(inf.followers)}</td>
                      <td><span className={`badge ${TIER_COLORS[t] || 'badge-gray'}`}>{t}</span></td>
                      <td><div style={{ fontSize: '.8rem' }}>{inf.collegeName||'—'}</div><div className="cell-sub">{inf.city}</div></td>
                      <td>{formatFollowers(inf.avgViews||0)}</td>
                      <td><span style={{ fontWeight: 700, color: (inf.erPercent||0) > 5 ? 'var(--success)' : 'var(--text)' }}>{inf.erPercent||0}%</span></td>
                      <td style={{ fontSize: '.8rem' }}><MaskedContact value={inf.contactNumber} type="phone" /></td>
                      <td style={{ fontSize: '.76rem' }}>{inf.contentLanguage||'—'}</td>
                      <td><span className={`badge ${STATUS_COLORS[inf.status] || 'badge-gray'}`}>{inf.status}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-icon" onClick={() => openEdit(inf)}><Edit2 size={14}/></button>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => del(inf.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={13}>
                      <div className="empty-state">
                        <Star size={40} color="var(--border-2)"/>
                        <div className="empty-state-title">No college ambassadors found</div>
                        <div className="empty-state-text">Use AI Import or click Add Ambassador.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="pagination">
            <span>{Math.min((page-1)*PAGE+1, total)}–{Math.min(page*PAGE, total)} of {total}</span>
            <div className="page-btns">
              <button className="page-btn" disabled={page===1} onClick={() => setPage(p => p-1)}>‹</button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>{p}</button>)}
              <button className="page-btn" disabled={page===pages} onClick={() => setPage(p => p+1)}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Ambassador' : 'Add Ambassador'}
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Full Name <span className="req">*</span></label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ambassador's name"/></div>
          <div className="form-group"><label className="form-label">Instagram Link</label>
            <input className="input" value={form.instagramLink} onChange={e => setForm(f => ({ ...f, instagramLink: e.target.value }))} placeholder="instagram.com/username"/></div>
          <div className="form-group"><label className="form-label">Gender</label>
            <select className="select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Select</option>{['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Followers</label>
            <input className="input" type="number" value={form.followers||''} onChange={e => setForm(f => ({ ...f, followers: parseInt(e.target.value)||0 }))} placeholder="e.g., 5000"/>
            {form.followers > 0 && <div className="form-hint">Tier: <strong>{tier(form)}</strong> ({formatFollowers(form.followers)})</div>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group"><label className="form-label">Niche / Role</label>
            <input className="input" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="Campus Ambassador"/></div>
          <div className="form-group"><label className="form-label">College Name</label>
            <input className="input" value={form.collegeName} onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))} placeholder="e.g., Symbiosis Pune"/></div>
          <div className="form-group"><label className="form-label">City</label>
            <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City"/></div>
          <div className="form-group"><label className="form-label">Zone</label>
            <select className="select" value={form.zone||''} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
              <option value="">Select Zone</option>{Object.values(ZONES).map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
            </select></div>
        </div>

        <div className="form-row">
          <div className="form-group"><label className="form-label">Avg Views</label>
            <input className="input" type="number" value={form.avgViews||''} onChange={e => setForm(f => ({ ...f, avgViews: parseInt(e.target.value)||0 }))} placeholder="Avg Views"/></div>
          <div className="form-group"><label className="form-label">Engagement Rate %</label>
            <input className="input" type="number" step=".1" value={form.erPercent||''} onChange={e => setForm(f => ({ ...f, erPercent: parseFloat(e.target.value)||0 }))} placeholder="ER %"/></div>
          <div className="form-group"><label className="form-label">Contact Number</label>
            <input className="input" value={form.contactNumber||''} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} placeholder="Mobile"/></div>
          <div className="form-group"><label className="form-label">Content Language</label>
            <input className="input" value={form.contentLanguage||''} onChange={e => setForm(f => ({ ...f, contentLanguage: e.target.value }))} placeholder="Hindi, English"/></div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group"><label className="form-label">YouTube Link</label>
            <input className="input" value={form.youtubeLink||''} onChange={e => setForm(f => ({ ...f, youtubeLink: e.target.value }))} placeholder="youtube.com/channel"/></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['Active','Inactive','Pending Outreach'].map(s => <option key={s}>{s}</option>)}
            </select></div>
        </div>
      </Modal>

      <AIImportModal open={aiModal} onClose={() => setAiModal(false)} entityType="influencer" onImported={refresh} />
    </div>
  );
}
