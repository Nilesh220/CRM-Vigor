import { useState, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import AIImportModal from '../components/ui/AIImportModal';
import ImportCSVModal from '../components/ui/ImportCSVModal';
import { useToast, useSession } from '../contexts/AppContext';
import {
  InfluencerDB, CampaignDB, ShortlistDB, genId, logActivity, searchFilter,
  paginate, canExport, getInfluencerTier, formatFollowers, ZONES, getZoneColor,
  exportToCSV, formatINR
} from '../lib/data';
import {
  Plus, Search, Download, Star, Edit2, Trash2, ChevronLeft, ChevronRight, X,
  Zap, ExternalLink, Instagram, Sparkles, List, FileText, Check, AlertCircle, Eye,
  Youtube, Clock, Upload
} from 'lucide-react';

const TIER_COLORS = { Nano: 'badge-green', Micro: 'badge-blue', 'Mid Micro': 'badge-teal', Macro: 'badge-purple', Mega: 'badge-yellow' };
const TIER_RANGES = { Nano: '1K–10K', Micro: '10K–35K', 'Mid Micro': '35K–100K', Macro: '100K–600K', Mega: '600K+' };
const STATUS_COLORS = { Active: 'badge-green', Inactive: 'badge-gray', 'Pending Outreach': 'badge-yellow' };

const SHORTLIST_STATUSES = ['shortlisted', 'contacted', 'confirmed', 'rejected'];
const SHORTLIST_STATUS_LABELS = {
  shortlisted: 'Shortlisted',
  contacted: 'Outreach Done',
  confirmed: 'Confirmed / Live',
  rejected: 'Rejected / Passed'
};
const SHORTLIST_STATUS_COLORS = {
  shortlisted: 'badge-gray',
  contacted: 'badge-blue',
  confirmed: 'badge-green',
  rejected: 'badge-red'
};

function emptyInfluencer() {
  return {
    name: '', instagramLink: '', gender: '', followers: 0, genre: '', collegeName: '', city: '', zone: '',
    avgViews: 0, erPercent: 0, contactNumber: '', contentLanguage: '', youtubeLink: '', status: 'Active'
  };
}

export default function Influencers() {
  const toast = useToast();
  const session = useSession();
  
  // Tab control: 'database' or 'shortlist'
  const [activeTab, setActiveTab] = useState('database');
  
  // Influencers Database state
  const [data, setData] = useState(() => InfluencerDB.all().filter(i => i.type !== 'college'));
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 20;

  const [modal, setModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyInfluencer());

  // Campaign Shortlists state
  const [campaigns, setCampaigns] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [creatorToAdd, setCreatorToAdd] = useState('');
  const [noteEditId, setNoteEditId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  useEffect(() => {
    // Initial fetch from Supabase stores
    InfluencerDB.syncFromDB().then(rows => setData(rows.filter(i => i.type !== 'college')));
    CampaignDB.syncFromDB().then(rows => setCampaigns(rows));
    ShortlistDB.syncFromDB().then(rows => setShortlists(rows));
  }, []);

  const refresh = () => {
    setData(InfluencerDB.all().filter(i => i.type !== 'college'));
  };

  const refreshShortlists = () => {
    setShortlists(ShortlistDB.all());
  };

  const tier = f => getInfluencerTier(parseInt(f?.followers || 0));

  // Filters for creator database
  const filtered = (() => {
    let d = data;
    // P4: Team scoping — influencer role sees only their own entries
    if (session?.role === 'influencer') {
      d = d.filter(i => i.createdBy === session.id);
    }
    if (search) d = searchFilter(d, search, ['name', 'collegeName', 'city', 'genre', 'contentLanguage']);
    if (filterTier) d = d.filter(i => (i.tier || tier(i)) === filterTier);
    if (filterGender) d = d.filter(i => i.gender === filterGender);
    if (filterStatus) d = d.filter(i => i.status === filterStatus);
    return d;
  })();
  const { data: rows, total, pages } = paginate(filtered, page, PAGE);

  const tierCounts = ['Nano', 'Micro', 'Mid Micro', 'Macro', 'Mega'].map(t => ({
    t, count: data.filter(i => (i.tier || tier(i)) === t).length,
    range: TIER_RANGES[t]
  }));

  function openAdd() { setEditId(null); setForm(emptyInfluencer()); setModal(true); }
  function openEdit(inf) { setEditId(inf.id); setForm({ ...emptyInfluencer(), ...inf }); setModal(true); }

  async function save() {
    if (!form.name.trim()) { toast('Name required.', 'warning'); return; }
    const payload = { ...form, tier: tier(form), followers: parseInt(form.followers) || 0, avgViews: parseInt(form.avgViews) || 0, erPercent: parseFloat(form.erPercent) || 0 };
    if (editId) {
      await InfluencerDB.update(editId, payload);
      logActivity('Updated', 'Influencer', form.name);
      toast('Influencer updated!', 'success');
    } else {
      payload.id = genId('inf'); payload.createdBy = session?.id; payload.createdAt = new Date().toISOString(); payload.type = 'creator';
      await InfluencerDB.add(payload);
      logActivity('Added', 'Influencer', form.name, formatFollowers(payload.followers) + ' followers');
      toast('Influencer added!', 'success');
    }
    setModal(false); refresh();
  }

  async function del(id) {
    const inf = InfluencerDB.get(id);
    if (!confirm(`Delete "${inf?.name}"?`)) return;
    await InfluencerDB.remove(id); logActivity('Deleted', 'Influencer', inf?.name || id);
    toast('Influencer deleted.', 'success'); refresh();
  }

  async function handleCSVImport(rows) {
    const items = rows.map(r => ({
      ...emptyInfluencer(), id: genId('inf'), createdBy: session?.id, createdAt: new Date().toISOString(), type: 'creator',
      name: r.name || '', instagramLink: r.instagramLink || '', gender: r.gender || '',
      followers: parseInt(r.followers) || 0, genre: r.genre || '', collegeName: r.collegeName || '',
      city: r.city || '', zone: r.zone || '', contactNumber: r.contactNumber || '',
      contentLanguage: r.contentLanguage || '', youtubeLink: r.youtubeLink || '', status: r.status || 'Active',
    })).map(i => ({ ...i, tier: getInfluencerTier(i.followers) }));
    await InfluencerDB.bulkAdd(items);
    logActivity('Imported', 'Influencer', `${items.length} influencers via CSV`);
    refresh();
  }

  function exportCSV() {
    if (!canExport()) { toast('Export access denied.', 'error'); return; }
    const r = InfluencerDB.all().map(i => ({ Name: i.name, Instagram: i.instagramLink, Gender: i.gender, Followers: i.followers, Tier: i.tier || tier(i), Genre: i.genre, College: i.collegeName, City: i.city, ER: i.erPercent + '%', Contact: i.contactNumber, Status: i.status }));
    const csv = [Object.keys(r[0]).join(','), ...r.map(x => Object.values(x).map(v => `"${v || ''}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'VL_Influencers.csv'; a.click();
    logActivity('Exported', 'Influencer', 'All influencers');
  }

  // Shortlist operational functions
  const activeShortlist = shortlists.filter(s => s.campaignId === selectedCampId);

  async function addToShortlist() {
    if (!selectedCampId) { toast('Please select a campaign', 'warning'); return; }
    if (!creatorToAdd) { toast('Please select an influencer to add', 'warning'); return; }
    
    const influencer = data.find(i => i.id === creatorToAdd);
    const campaign = campaigns.find(c => c.id === selectedCampId);
    if (!influencer || !campaign) return;

    if (activeShortlist.some(s => s.influencerId === creatorToAdd)) {
      toast('Creator is already shortlisted for this campaign', 'info');
      return;
    }

    const payload = {
      id: genId('shl'),
      campaignId: selectedCampId,
      influencerId: creatorToAdd,
      note: '',
      status: 'shortlisted',
      addedBy: session?.id,
      addedByName: session?.name
    };

    await ShortlistDB.add(payload);
    logActivity('Shortlisted', 'Creator', influencer.name, `for campaign "${campaign.name}"`);
    toast('Added to campaign shortlist!', 'success');
    setCreatorToAdd('');
    refreshShortlists();
  }

  async function updateShortlistStatus(id, newStatus) {
    const sItem = ShortlistDB.get(id);
    if (!sItem) return;
    await ShortlistDB.update(id, { status: newStatus });
    refreshShortlists();
    toast('Status updated', 'success');
  }

  async function saveShortlistNote(id) {
    await ShortlistDB.update(id, { note: tempNote });
    setNoteEditId(null);
    setTempNote('');
    refreshShortlists();
    toast('Note saved', 'success');
  }

  async function removeFromShortlist(id, name) {
    if (!confirm(`Remove "${name}" from this shortlist?`)) return;
    await ShortlistDB.remove(id);
    toast('Removed from shortlist', 'info');
    refreshShortlists();
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Creators & Shortlists</h1>
          <p className="text-sm text-muted">Manage the influencer database and campaign creator shortlists.</p>
        </div>
        {activeTab === 'database' && (
          <div className="flex gap-2">
            {canExport() && <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={13} /> Export</button>}
            <button className="btn btn-secondary btn-sm" onClick={() => setCsvModal(true)}><Upload size={13} /> Import CSV</button>
            <button className="btn btn-ai btn-sm" onClick={() => setAiModal(true)}>
              <Sparkles size={13} /> AI Import
            </button>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Influencer</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>
          <Star size={13} style={{ marginRight: 6 }} /> Creator Database
        </button>
        <button className={`tab-btn ${activeTab === 'shortlist' ? 'active' : ''}`} onClick={() => setActiveTab('shortlist')}>
          <List size={13} style={{ marginRight: 6 }} /> Campaign Shortlists
        </button>
      </div>

      {/* Tab 1: Creator Database */}
      {activeTab === 'database' && (
        <>
          {/* Tier KPI Cards */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 16 }}>
            {[
              { label: 'Total', value: data.length, c: '#8b5cf6', bg: '#f5f3ff' },
              { label: 'Active', value: data.filter(i => i.status === 'Active').length, c: '#10b981', bg: '#ecfdf5' },
              ...tierCounts.map(t => ({ label: `${t.t} (${t.range})`, value: t.count, c: { Nano: '#10b981', Micro: '#3b82f6', 'Mid Micro': '#0ea5e9', Macro: '#8b5cf6', Mega: '#f59e0b' }[t.t], bg: { Nano: '#ecfdf5', Micro: '#eff6ff', 'Mid Micro': '#f0f9ff', Macro: '#f5f3ff', Mega: '#fffbeb' }[t.t] })),
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
                  <Search size={14} /><input placeholder="Search name, college, genre…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                  {search && <button onClick={() => { setSearch(''); setPage(1); }}><X size={12}/></button>}
                </div>
                <select className="select" style={{ width: 'auto' }} value={filterTier} onChange={e => { setFilterTier(e.target.value); setPage(1); }}>
                  <option value="">All Tiers</option>
                  {['Nano', 'Micro', 'Mid Micro', 'Macro', 'Mega'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="select" style={{ width: 'auto' }} value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}>
                  <option value="">All Genders</option>
                  {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                </select>
                <select className="select" style={{ width: 'auto' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  {['Active', 'Inactive', 'Pending Outreach'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Instagram</th><th>Gender</th><th>Followers</th><th>Tier</th><th>Genre</th><th>College / City</th><th>Avg Views</th><th>ER %</th><th>Contact</th><th>Language</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((inf, idx) => {
                    const t = inf.tier || tier(inf);
                    return (
                      <tr key={inf.id}>
                        <td style={{ color: 'var(--text-3)', fontSize: '.78rem' }}>{(page - 1) * PAGE + idx + 1}</td>
                        <td><div className="cell-primary">{inf.name}</div></td>
                        <td>
                          <div style={{display:'flex',gap:4,alignItems:'center'}}>
                            {inf.instagramLink ? (
                              <a href={`https://${inf.instagramLink.replace('https://', '')}`} target="_blank" rel="noreferrer"
                                title={inf.instagramLink}
                                style={{ color: '#e1306c', display: 'flex', alignItems: 'center' }}>
                                <Instagram size={15} />
                              </a>
                            ) : null}
                            {inf.youtubeLink ? (
                              <a href={`https://${inf.youtubeLink.replace('https://', '')}`} target="_blank" rel="noreferrer"
                                title={inf.youtubeLink}
                                style={{ color: '#ff0000', display: 'flex', alignItems: 'center' }}>
                                <Youtube size={15} />
                              </a>
                            ) : null}
                            {!inf.instagramLink && !inf.youtubeLink && <span style={{color:'var(--text-3)'}}>—</span>}
                          </div>
                        </td>
                        <td style={{ fontSize: '.8rem' }}>{inf.gender || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{formatFollowers(inf.followers)}</td>
                        <td><span className={`badge ${TIER_COLORS[t] || 'badge-gray'}`}>{t}</span></td>
                        <td>{inf.genre ? <span className="chip">{inf.genre}</span> : '—'}</td>
                        <td><div style={{ fontSize: '.8rem' }}>{inf.collegeName || '—'}</div><div className="cell-sub">{inf.city}</div></td>
                        <td>{formatFollowers(inf.avgViews || 0)}</td>
                        <td><span style={{ fontWeight: 700, color: (inf.erPercent || 0) > 5 ? 'var(--success)' : 'var(--text)' }}>{inf.erPercent || 0}%</span></td>
                        <td style={{ fontSize: '.8rem' }}>{inf.contactNumber || '—'}</td>
                        <td style={{ fontSize: '.76rem' }}>{inf.contentLanguage || '—'}</td>
                        <td><span className={`badge ${STATUS_COLORS[inf.status] || 'badge-gray'}`}>{inf.status}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-icon" title={inf.updatedAt ? `Last edited: ${new Date(inf.updatedAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}` : inf.createdAt ? `Added: ${new Date(inf.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short'})}` : ''} onClick={() => openEdit(inf)}><Edit2 size={14} /></button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => del(inf.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={14}><div className="empty-state"><Star size={40} color="var(--border-2)" /><div className="empty-state-title">No influencers found</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{Math.min((page - 1) * PAGE + 1, total)}–{Math.min(page * PAGE, total)} of {total}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={12} /></button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
                <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Campaign Shortlists */}
      {activeTab === 'shortlist' && (
        <div className="grid-1-3">
          {/* Campaign Selector Column */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Campaign Select</div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Active Campaigns</label>
              <select className="select" value={selectedCampId} onChange={e => setSelectedCampId(e.target.value)}>
                <option value="">Select a campaign…</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.clientName ? `(${c.clientName})` : ''}</option>
                ))}
              </select>
            </div>

            {selectedCampId && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 10 }}>
                  Shortlist Creator
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <select className="select" value={creatorToAdd} onChange={e => setCreatorToAdd(e.target.value)}>
                    <option value="">Select creator to shortlist…</option>
                    {data.filter(i => !activeShortlist.some(s => s.influencerId === i.id)).map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({formatFollowers(i.followers)} - {i.genre || 'General'})</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary w-full" onClick={addToShortlist}>
                  <Plus size={14} style={{ marginRight: 6 }} /> Add to Shortlist
                </button>
              </div>
            )}
          </div>

          {/* Shortlist Table Column */}
          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Campaign Creators Shortlist</div>
                <div className="card-subtitle">
                  {selectedCampId ? `Shortlisted profiles for ${campaigns.find(c => c.id === selectedCampId)?.name}` : 'Please select a campaign on the left to manage shortlists'}
                </div>
              </div>
              {selectedCampId && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-purple">{activeShortlist.length} Shortlisted</span>
                  <span className="badge badge-green">{activeShortlist.filter(s => s.status === 'confirmed').length} Confirmed</span>
                </div>
              )}
            </div>

            {selectedCampId ? (
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Social Link</th>
                      <th>Followers</th>
                      <th>Status</th>
                      <th>Notes & Campaign Details</th>
                      <th style={{ width: 100, textAlign: 'center' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeShortlist.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: 'var(--text-3)' }}>
                          <Star size={36} color="var(--border-2)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                          <div>No creators shortlisted yet. Add one from the sidebar!</div>
                        </td>
                      </tr>
                    ) : (
                      activeShortlist.map(s => {
                        const inf = data.find(i => i.id === s.influencerId);
                        if (!inf) return null;
                        const t = inf.tier || tier(inf);
                        return (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: 700 }} className="cell-primary">{inf.name}</div>
                              <div className="cell-sub">{inf.city || 'National'}</div>
                            </td>
                            <td>
                              {inf.instagramLink ? (
                                <a href={`https://${inf.instagramLink.replace('https://', '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <ExternalLink size={11} /> Instagram
                                </a>
                              ) : '—'}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {formatFollowers(inf.followers)}
                              <div className="cell-sub">{t}</div>
                            </td>
                            <td>
                              <select className="select" style={{ padding: '4px 8px', fontSize: '.78rem', height: 'auto', width: 'auto' }} value={s.status || 'shortlisted'} onChange={e => updateShortlistStatus(s.id, e.target.value)}>
                                {SHORTLIST_STATUSES.map(st => (
                                  <option key={st} value={st}>{SHORTLIST_STATUS_LABELS[st]}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              {noteEditId === s.id ? (
                                <div className="flex gap-2">
                                  <input className="input input-sm" style={{ minWidth: 200 }} value={tempNote} onChange={e => setTempNote(e.target.value)} placeholder="Outreach info, costs, etc." />
                                  <button className="btn btn-icon btn-primary btn-sm" onClick={() => saveShortlistNote(s.id)}><Check size={12} /></button>
                                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setNoteEditId(null); setTempNote(''); }}><X size={12} /></button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: '.8rem', color: s.note ? 'var(--text)' : 'var(--text-3)', fontStyle: s.note ? 'normal' : 'italic' }}>
                                    {s.note || 'No notes added'}
                                  </span>
                                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setNoteEditId(s.id); setTempNote(s.note || ''); }}>
                                    <Edit2 size={11} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeFromShortlist(s.id, inf.name)}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="center" style={{ height: 260, flexDirection: 'column', gap: 8, color: 'var(--text-3)' }}>
                <AlertCircle size={32} color="var(--border-2)" />
                <span>Select a campaign from the selector card to view shortlisted creators.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Influencer' : 'Add Influencer'}
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Full Name <span className="req">*</span></label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Creator's full name" /></div>
          <div className="form-group"><label className="form-label">Instagram Link</label>
            <input className="input" value={form.instagramLink} onChange={e => setForm(f => ({ ...f, instagramLink: e.target.value }))} placeholder="instagram.com/username" /></div>
          <div className="form-group"><label className="form-label">Gender</label>
            <select className="select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Select</option>{['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Followers</label>
            <input className="input" type="number" value={form.followers || ''} onChange={e => setForm(f => ({ ...f, followers: parseInt(e.target.value) || 0 }))} placeholder="e.g., 45000" />
            {form.followers > 0 && <div className="form-hint">Tier: <strong>{tier(form)}</strong> ({formatFollowers(form.followers)})</div>}
          </div>
        </div>
        <div className="form-row">
          {[['genre', 'Genre / Niche', 'Lifestyle, Tech, Food'], ['collegeName', 'College', 'College / University'], ['city', 'City', 'City']].map(([k, l, pl]) => (
            <div key={k} className="form-group"><label className="form-label">{l}</label>
              <input className="input" value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={pl} /></div>
          ))}
          <div className="form-group"><label className="form-label">Zone</label>
            <select className="select" value={form.zone || ''} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
              <option value="">Select Zone</option>{Object.values(ZONES).map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Avg Views</label>
            <input className="input" type="number" value={form.avgViews || ''} onChange={e => setForm(f => ({ ...f, avgViews: parseInt(e.target.value) || 0 }))} placeholder="e.g., 12000" /></div>
          <div className="form-group"><label className="form-label">Engagement Rate %</label>
            <input className="input" type="number" step=".1" value={form.erPercent || ''} onChange={e => setForm(f => ({ ...f, erPercent: parseFloat(e.target.value) || 0 }))} placeholder="e.g., 4.5" /></div>
          <div className="form-group"><label className="form-label">Contact Number</label>
            <input className="input" value={form.contactNumber || ''} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} placeholder="Mobile" /></div>
          <div className="form-group"><label className="form-label">Content Language</label>
            <input className="input" value={form.contentLanguage || ''} onChange={e => setForm(f => ({ ...f, contentLanguage: e.target.value }))} placeholder="Hindi, English" /></div>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group"><label className="form-label">YouTube Link</label>
            <input className="input" value={form.youtubeLink || ''} onChange={e => setForm(f => ({ ...f, youtubeLink: e.target.value }))} placeholder="youtube.com/channel" /></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['Active', 'Inactive', 'Pending Outreach'].map(s => <option key={s}>{s}</option>)}
            </select></div>
        </div>
      </Modal>
      <AIImportModal open={aiModal} onClose={() => setAiModal(false)} entityType="influencer" onImported={refresh} />
      <ImportCSVModal
        open={csvModal} onClose={() => setCsvModal(false)} title="Import Influencers from CSV/Excel"
        columns={[
          { key: 'name', label: 'Name', required: true }, { key: 'instagramLink', label: 'Instagram Link' },
          { key: 'gender', label: 'Gender' }, { key: 'followers', label: 'Followers' },
          { key: 'genre', label: 'Genre/Niche' }, { key: 'collegeName', label: 'College' },
          { key: 'city', label: 'City' }, { key: 'zone', label: 'Zone' },
          { key: 'contactNumber', label: 'Contact Number' }, { key: 'contentLanguage', label: 'Language' },
          { key: 'youtubeLink', label: 'YouTube Link' }, { key: 'status', label: 'Status' },
        ]}
        onImport={handleCSVImport}
      />
    </div>
  );
}
