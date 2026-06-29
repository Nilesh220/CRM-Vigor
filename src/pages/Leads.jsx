import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import {
  LeadDB, getAllUsers, genId, logActivity, formatINR, formatDate, formatDateTime, searchFilter, exportToCSV,
  LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCES, BRAND_TYPES, LEAD_PRIORITIES,
  hasPermission
} from '../lib/data';
import CommentPanel from '../components/ui/CommentPanel';
import ImportCSVModal from '../components/ui/ImportCSVModal';
import {
  Plus, Search, Download, Upload, LayoutGrid, List, GripVertical,
  Phone, Mail, Calendar, DollarSign, User, Building2, Tag, ArrowRight,
  MoreVertical, Edit2, Trash2, ChevronRight, Target, TrendingUp, AlertCircle, X, MessageSquare,
  Linkedin, ExternalLink, Clock
} from 'lucide-react';

const PRIORITY_COLORS = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export default function Leads() {
  const session = useSession();
  const toast = useToast();

  const canCreate = hasPermission(session, 'leads', 'create');
  const canEdit = hasPermission(session, 'leads', 'edit');
  const canDelete = hasPermission(session, 'leads', 'delete');
  const canExport = hasPermission(session, 'leads', 'export');
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState('kanban'); // 'kanban' or 'table'
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [draggedId, setDraggedId] = useState(null);
  const [csvModal, setCsvModal] = useState(false);
  const [form, setForm] = useState({
    brandName: '', pocName: '', pocEmail: '', pocPhone: '',
    category: '', brandType: '', source: '', status: 'new',
    priority: 'medium', dealValue: '', notes: '', nextFollowUp: '', assignedTo: '',
    linkedinProfile: '', instagramHandle: ''
  });

  const users = getAllUsers();

  useEffect(() => {
    LeadDB.syncFromDB().then(rows => setLeads(rows));
  }, []);

  const refresh = () => setLeads(LeadDB.all());

  const filtered = searchFilter(
    leads.filter(l => {
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    }), search, ['brandName', 'pocName', 'pocEmail', 'category', 'brandType']
  );

  function openAdd() {
    if (!canCreate) { toast('You do not have permission to create leads', 'error'); return; }
    setEditId(null);
    setForm({
      brandName: '', pocName: '', pocEmail: '', pocPhone: '',
      category: '', brandType: '', source: '', status: 'new',
      priority: 'medium', dealValue: '', notes: '', nextFollowUp: '', assignedTo: '',
      linkedinProfile: '', instagramHandle: ''
    });
    setModal(true);
  }

  function openEdit(lead) {
    if (!canEdit) { toast('You do not have permission to edit leads', 'error'); return; }
    setEditId(lead.id);
    setForm({
      brandName: lead.brandName || '', pocName: lead.pocName || '',
      pocEmail: lead.pocEmail || '', pocPhone: lead.pocPhone || '',
      category: lead.category || '', brandType: lead.brandType || '',
      source: lead.source || '', status: lead.status || 'new',
      priority: lead.priority || 'medium', dealValue: lead.dealValue || '',
      notes: lead.notes || '', nextFollowUp: lead.nextFollowUp || '',
      assignedTo: lead.assignedTo || '',
      linkedinProfile: lead.linkedinProfile || '', instagramHandle: lead.instagramHandle || ''
    });
    setModal(true);
  }

  async function save() {
    if (editId && !canEdit) { toast('No edit permissions', 'error'); return; }
    if (!editId && !canCreate) { toast('No create permissions', 'error'); return; }
    if (!form.brandName.trim()) { toast('Brand name is required', 'warning'); return; }
    const payload = {
      ...form,
      dealValue: parseFloat(form.dealValue) || 0,
      addedBy: session?.id,
      addedByName: session?.name
    };
    if (editId) {
      await LeadDB.update(editId, payload);
      logActivity('Updated', 'Lead', form.brandName);
      toast('Lead updated', 'success');
    } else {
      payload.id = genId('lead');
      await LeadDB.add(payload);
      logActivity('Created', 'Lead', form.brandName);
      toast('Lead created', 'success');
    }
    refresh();
    setModal(false);
  }

  async function removeLead(id, name) {
    if (!canDelete) { toast('You do not have permission to delete leads', 'error'); return; }
    if (!confirm(`Delete lead "${name}"?`)) return;
    await LeadDB.remove(id);
    logActivity('Deleted', 'Lead', name);
    toast('Lead deleted', 'info');
    refresh();
    if (detailLead?.id === id) setDetailLead(null);
  }

  async function changeStatus(id, newStatus) {
    if (!canEdit) { toast('You do not have permission to modify leads', 'error'); return; }
    const lead = LeadDB.get(id);
    if (!lead) return;
    await LeadDB.update(id, { status: newStatus });
    logActivity('Moved', 'Lead', lead.brandName, `→ ${LEAD_STATUS_LABELS[newStatus]}`);
    refresh();
    if (detailLead?.id === id) setDetailLead({ ...lead, status: newStatus });
  }

  // Drag and drop for Kanban
  function onDragStart(e, id) { 
    if (!canEdit) { e.preventDefault(); return; }
    setDraggedId(id); 
    e.dataTransfer.effectAllowed = 'move'; 
  }
  function onDragOver(e) { 
    if (!canEdit) return;
    e.preventDefault(); 
    e.currentTarget.classList.add('drop-zone'); 
  }
  function onDragLeave(e) { e.currentTarget.classList.remove('drop-zone'); }
  function onDrop(e, status) {
    e.currentTarget.classList.remove('drop-zone');
    if (draggedId) changeStatus(draggedId, status);
    setDraggedId(null);
  }

  function handleExport() {
    if (!canExport) { toast('You do not have permission to export leads', 'error'); return; }
    exportToCSV(filtered, 'vigor_leads.csv', {
      brandName: 'Brand Name', pocName: 'POC Name', pocEmail: 'Email', pocPhone: 'Phone',
      category: 'Category', brandType: 'Brand Type', source: 'Source', status: 'Status',
      priority: 'Priority', dealValue: 'Deal Value', nextFollowUp: 'Follow-up Date',
      addedByName: 'Added By'
    });
    toast('Leads exported', 'success');
  }

  async function handleCSVImport(rows) {
    const items = rows.map(r => ({
      id: genId('lead'), createdBy: session?.id, createdAt: new Date().toISOString(),
      addedByName: session?.name || 'Import',
      brandName: r.brandName || '', pocName: r.pocName || '', pocEmail: r.pocEmail || '',
      pocPhone: r.pocPhone || '', category: r.category || '', brandType: r.brandType || '',
      source: r.source || '', status: r.status || 'new', priority: r.priority || 'medium',
      dealValue: parseFloat(r.dealValue) || 0, notes: r.notes || '',
      linkedinProfile: r.linkedinProfile || '', instagramHandle: r.instagramHandle || ''
    }));
    await LeadDB.bulkAdd(items);
    logActivity('Imported', 'Lead', `${items.length} leads via CSV`);
    const rows2 = await LeadDB.syncFromDB();
    setLeads(rows2);
  }

  // Stats
  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {});
  const pipelineValue = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + (l.dealValue || 0), 0);

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Leads</h1>
          <p className="text-sm text-muted">Track and progress leads through the sales pipeline.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-secondary" onClick={() => setCsvModal(true)}><Upload size={14} /> Import CSV</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> New Lead</button>
        </div>
      </div>

      {/* Pipeline Status Pills */}
      <div className="lead-pipeline-pills">
        {LEAD_STATUSES.map(s => (
          <button
            key={s}
            className={`pipeline-pill ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            style={{ '--pill-color': s === 'new' ? '#3b82f6' : s === 'contacted' ? '#7c3aed' : s === 'qualified' ? '#0f766e' : s === 'proposal_sent' ? '#ea580c' : s === 'negotiation' ? '#f59e0b' : s === 'won' ? '#10b981' : '#ef4444' }}
          >
            <span className="pill-label">{LEAD_STATUS_LABELS[s]}</span>
            <span className="pill-count">{statusCounts[s]}</span>
          </button>
        ))}
        <div className="pipeline-pill pipeline-total">
          <span className="pill-label">Pipeline Value</span>
          <span className="pill-count" style={{ color: 'var(--primary)' }}>{formatINR(pipelineValue)}</span>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 items-center" style={{ flex: 1 }}>
          <div className="search-wrap" style={{ maxWidth: 300 }}>
            <Search size={14} />
            <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 160 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="view-toggle">
          <button className={`vt-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} title="Pipeline View">
            <LayoutGrid size={15} />
          </button>
          <button className={`vt-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')} title="Table View">
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="lead-kanban">
          {LEAD_STATUSES.map(status => {
            const colLeads = filtered.filter(l => l.status === status);
            const colColor = status === 'new' ? '#3b82f6' : status === 'contacted' ? '#7c3aed' : status === 'qualified' ? '#0f766e' : status === 'proposal_sent' ? '#ea580c' : status === 'negotiation' ? '#f59e0b' : status === 'won' ? '#10b981' : '#ef4444';
            return (
              <div key={status} className="lead-kanban-col"
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={e => onDrop(e, status)}
              >
                <div className="lead-kanban-head" style={{ borderTopColor: colColor }}>
                  <div className="flex items-center gap-2">
                    <span className="col-indicator" style={{ background: colColor }} />
                    <span className="kanban-col-label">{LEAD_STATUS_LABELS[status]}</span>
                  </div>
                  <span className="col-count">{colLeads.length}</span>
                </div>
                <div className="lead-kanban-body">
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="lead-card"
                      draggable
                      onDragStart={e => onDragStart(e, lead.id)}
                      onClick={() => setDetailLead(lead)}
                      style={{ '--lc': colColor }}
                    >
                      <div className="lead-card-header">
                        <span className="lead-card-brand">{lead.brandName}</span>
                        <span className={`badge ${PRIORITY_COLORS[lead.priority || 'medium']}`} style={{ fontSize: '.6rem' }}>
                          {PRIORITY_LABELS[lead.priority || 'medium']}
                        </span>
                      </div>
                      {lead.pocName && <div className="lead-card-poc"><User size={11} /> {lead.pocName}</div>}
                      {lead.dealValue > 0 && (
                        <div className="lead-card-deal">
                          <DollarSign size={11} /> {formatINR(lead.dealValue)}
                        </div>
                      )}
                      <div className="lead-card-footer">
                        {lead.brandType && <span className="chip" style={{ fontSize: '.62rem' }}>{lead.brandType}</span>}
                        {lead.source && <span className="text-xs text-muted">{lead.source}</span>}
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="kanban-empty">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>POC Name</th>
                <th>Category</th>
                <th>Brand Type</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Deal Value</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Added By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No leads found</td></tr>
              )}
              {filtered.map(lead => (
                <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => setDetailLead(lead)}>
                  <td className="cell-primary">{lead.brandName}</td>
                  <td>{lead.pocName || '—'}</td>
                  <td>{lead.category || '—'}</td>
                  <td>{lead.brandType || '—'}</td>
                  <td style={{ fontSize: '.78rem', color: 'var(--text-2)' }}>{lead.pocEmail || '—'}</td>
                  <td style={{ fontSize: '.78rem' }}>{lead.pocPhone || '—'}</td>
                  <td>{lead.source || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{lead.dealValue ? formatINR(lead.dealValue) : '—'}</td>
                  <td>
                    <select
                      className={`badge ${LEAD_STATUS_COLORS[lead.status]}`}
                      value={lead.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => changeStatus(lead.id, e.target.value)}
                      style={{ border: 'none', cursor: 'pointer', fontSize: '.68rem', padding: '3px 6px', appearance: 'auto', background: 'inherit', color: 'inherit', fontWeight: 700 }}
                    >
                      {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td><span className={`badge ${PRIORITY_COLORS[lead.priority || 'medium']}`}>{PRIORITY_LABELS[lead.priority || 'medium']}</span></td>
                  <td className="text-xs text-muted">{lead.addedByName || 'System'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-icon btn-ghost" onClick={e => { e.stopPropagation(); openEdit(lead); }}><Edit2 size={13} /></button>
                      <button className="btn btn-icon btn-ghost" onClick={e => { e.stopPropagation(); removeLead(lead.id, lead.brandName); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {detailLead && (
        <div className="overlay" onClick={() => setDetailLead(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{detailLead.brandName}</div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  <span className={`badge ${LEAD_STATUS_COLORS[detailLead.status]}`}>{LEAD_STATUS_LABELS[detailLead.status]}</span>
                  {' '}
                  <span className={`badge ${PRIORITY_COLORS[detailLead.priority || 'medium']}`} style={{ marginLeft: 4 }}>{PRIORITY_LABELS[detailLead.priority || 'medium']} Priority</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => { openEdit(detailLead); setDetailLead(null); }}><Edit2 size={12} /> Edit</button>
                <button className="modal-close" onClick={() => setDetailLead(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
              <button className={`detail-tab ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>
                <User size={13} /> Info
              </button>
              <button className={`detail-tab ${detailTab === 'comments' ? 'active' : ''}`} onClick={() => setDetailTab('comments')}>
                <MessageSquare size={13} /> Notes
              </button>
            </div>

            <div className="modal-body">
              {detailTab === 'info' && (
                <>
                  <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                    <div className="detail-field"><label>POC Name</label><span><User size={12} /> {detailLead.pocName || '—'}</span></div>
                    <div className="detail-field"><label>Phone</label><span><Phone size={12} /> {detailLead.pocPhone || '—'}</span></div>
                    <div className="detail-field"><label>Email</label><span><Mail size={12} /> {detailLead.pocEmail || '—'}</span></div>
                    <div className="detail-field"><label>Category</label><span><Tag size={12} /> {detailLead.category || '—'}</span></div>
                    <div className="detail-field"><label>Brand Type</label><span><Building2 size={12} /> {detailLead.brandType || '—'}</span></div>
                    <div className="detail-field"><label>Source</label><span><Target size={12} /> {detailLead.source || '—'}</span></div>
                    <div className="detail-field"><label>Deal Value</label><span style={{ fontWeight: 700, color: 'var(--success)' }}><DollarSign size={12} /> {detailLead.dealValue ? formatINR(detailLead.dealValue) : '—'}</span></div>
                    <div className="detail-field"><label>Follow-up</label><span><Calendar size={12} /> {detailLead.nextFollowUp ? formatDate(detailLead.nextFollowUp) : '—'}</span></div>
                  </div>
                  {/* Social Media Links */}
                  {(detailLead.linkedinProfile || detailLead.instagramHandle) && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      {detailLead.linkedinProfile && (
                        <a
                          href={detailLead.linkedinProfile.startsWith('http') ? detailLead.linkedinProfile : `https://${detailLead.linkedinProfile}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0a66c2', textDecoration: 'none' }}
                        >
                          <Linkedin size={13} /> Open LinkedIn
                        </a>
                      )}
                      {detailLead.instagramHandle && (
                        <a
                          href={`https://instagram.com/${detailLead.instagramHandle.replace('@', '')}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#e1306c', textDecoration: 'none' }}
                        >
                          <ExternalLink size={13} /> Instagram
                        </a>
                      )}
                    </div>
                  )}
                  {/* Date Modified */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: '.75rem', color: 'var(--text-3)' }}>
                    {detailLead.createdAt && <span><Clock size={11} style={{ marginRight: 3 }} />Added: {formatDateTime(detailLead.createdAt)}</span>}
                    {detailLead.updatedAt && <span><Clock size={11} style={{ marginRight: 3 }} />Edited: {formatDateTime(detailLead.updatedAt)}</span>}
                  </div>
                  {detailLead.notes && (
                    <div style={{ marginBottom: 16 }}>
                      <label className="form-label">Notes</label>
                      <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{detailLead.notes}</div>
                    </div>
                  )}
                  {/* Quick Status Change */}
                  <label className="form-label" style={{ marginBottom: 8 }}>Move to Stage</label>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {LEAD_STATUSES.filter(s => s !== detailLead.status).map(s => (
                      <button key={s} className="btn btn-sm btn-secondary" onClick={() => { changeStatus(detailLead.id, s); setDetailLead({ ...detailLead, status: s }); }}>
                        <ArrowRight size={11} /> {LEAD_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {detailTab === 'comments' && (
                <CommentPanel recordType="lead" recordId={detailLead.id} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Edit Lead' : 'New Lead'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Brand Name <span className="req">*</span></label>
                  <input className="input" placeholder="e.g. Glowtone Cosmetics" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">POC Name</label>
                  <input className="input" placeholder="Point of contact" value={form.pocName} onChange={e => setForm({ ...form, pocName: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" placeholder="email@brand.com" value={form.pocEmail} onChange={e => setForm({ ...form, pocEmail: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="input" placeholder="+91..." value={form.pocPhone} onChange={e => setForm({ ...form, pocPhone: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="input" placeholder="e.g. Brand Activation" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Brand Type</label>
                  <select className="select" value={form.brandType} onChange={e => setForm({ ...form, brandType: e.target.value })}>
                    <option value="">Select type</option>
                    {BRAND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select className="select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    <option value="">Select source</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deal Value (₹)</label>
                  <input className="input" type="number" placeholder="0" value={form.dealValue} onChange={e => setForm({ ...form, dealValue: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {LEAD_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Next Follow-up</label>
                  <input className="input" type="date" value={form.nextFollowUp} onChange={e => setForm({ ...form, nextFollowUp: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <select className="select" value={form.assignedTo || ''} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                    <option value="">Unassigned</option>
                    <optgroup label="Teams">
                      <option value="VigorSpace Team">VigorSpace Team</option>
                      <option value="Influencer Team">Influencer Team</option>

                      <option value="Digital Team">Digital Team</option>
                      <option value="Operations Team">Operations Team</option>
                      <option value="Finance Team">Finance Team</option>
                      <option value="HR Team">HR Team</option>
                    </optgroup>
                    <optgroup label="Members">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">LinkedIn Profile</label>
                  <input className="input" placeholder="linkedin.com/in/..." value={form.linkedinProfile || ''} onChange={e => setForm({ ...form, linkedinProfile: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram Handle</label>
                  <input className="input" placeholder="@handle or username" value={form.instagramHandle || ''} onChange={e => setForm({ ...form, instagramHandle: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="textarea" placeholder="Any notes about this lead..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Create Lead'}</button>
            </div>
          </div>
        </div>
      )}
      <ImportCSVModal
        open={csvModal} onClose={() => setCsvModal(false)} title="Import Leads from CSV/Excel"
        columns={[
          { key: 'brandName', label: 'Brand Name', required: true }, { key: 'pocName', label: 'POC Name' },
          { key: 'pocEmail', label: 'Email' }, { key: 'pocPhone', label: 'Phone' },
          { key: 'category', label: 'Category' }, { key: 'brandType', label: 'Brand Type' },
          { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' },
          { key: 'priority', label: 'Priority' }, { key: 'dealValue', label: 'Deal Value' },
          { key: 'linkedinProfile', label: 'LinkedIn' }, { key: 'instagramHandle', label: 'Instagram' },
          { key: 'notes', label: 'Notes' },
        ]}
        onImport={handleCSVImport}
      />
    </div>
  );
}
