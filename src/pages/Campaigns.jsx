import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import {
  CampaignDB, ClientDB, getAllUsers, genId, logActivity,
  formatINR, formatDate, searchFilter, exportToCSV,
  CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, CAMPAIGN_TYPES
} from '../lib/data';
import MultiAssignSelect from '../components/ui/MultiAssignSelect';
import CommentPanel from '../components/ui/CommentPanel';
import AttachmentsPanel from '../components/ui/AttachmentsPanel';
import {
  Plus, Search, Download, Megaphone, Calendar, DollarSign, Users,
  Edit2, Trash2, X, TrendingUp, Target, BarChart3, Clock, ArrowRight, Eye,
  MessageSquare, Paperclip
} from 'lucide-react';

export default function Campaigns() {
  const session = useSession();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [form, setForm] = useState({
    name: '', clientId: '', clientName: '', category: '', campaignType: '',
    status: 'planning', startDate: '', endDate: '', budget: '', spent: '',
    deliverables: '', brief: '', assignedTo: [], assignedToName: ''
  });

  const users = getAllUsers();

  useEffect(() => {
    CampaignDB.syncFromDB().then(rows => setCampaigns(rows));
    ClientDB.syncFromDB().then(rows => setClients(rows));
  }, []);

  const refresh = () => setCampaigns(CampaignDB.all());

  const filtered = searchFilter(
    campaigns.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterType && c.campaignType !== filterType) return false;
      return true;
    }), search, ['name', 'clientName', 'category', 'campaignType']
  );

  // KPI stats
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const activeCampaigns = campaigns.filter(c => !['completed', 'cancelled'].includes(c.status));
  const statusCounts = CAMPAIGN_STATUSES.reduce((acc, s) => {
    acc[s] = campaigns.filter(c => c.status === s).length;
    return acc;
  }, {});

  function openAdd() {
    setEditId(null);
    setForm({
      name: '', clientId: '', clientName: '', category: '', campaignType: '',
      status: 'planning', startDate: '', endDate: '', budget: '', spent: '',
      deliverables: '', brief: '', assignedTo: [], assignedToName: ''
    });
    setModal(true);
  }

  function openEdit(c) {
    setEditId(c.id);
    // Normalize assignedTo to array
    const assignedTo = Array.isArray(c.assignedTo)
      ? c.assignedTo
      : (c.assignedTo ? [c.assignedTo] : []);
    setForm({
      name: c.name || '', clientId: c.clientId || '', clientName: c.clientName || '',
      category: c.category || '', campaignType: c.campaignType || '',
      status: c.status || 'planning', startDate: c.startDate || '',
      endDate: c.endDate || '', budget: c.budget || '', spent: c.spent || '',
      deliverables: c.deliverables || '', brief: c.brief || '',
      assignedTo, assignedToName: c.assignedToName || ''
    });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) { toast('Campaign name is required', 'warning'); return; }
    const client = clients.find(c => c.id === form.clientId);
    const assignedTo = Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : []);
    const assignedToNames = assignedTo.map(id => {
      const u = users.find(u => u.id === id);
      return u ? u.name : id;
    });
    const payload = {
      ...form,
      assignedTo,
      clientName: client?.brandName || form.clientName || '',
      assignedToName: assignedToNames.join(', '),
      budget: parseFloat(form.budget) || 0,
      spent: parseFloat(form.spent) || 0,
      addedBy: session?.id,
      addedByName: session?.name
    };
    if (editId) {
      await CampaignDB.update(editId, payload);
      logActivity('Updated', 'Campaign', form.name);
      toast('Campaign updated', 'success');
    } else {
      payload.id = genId('camp');
      await CampaignDB.add(payload);
      logActivity('Created', 'Campaign', form.name);
      toast('Campaign created', 'success');
    }
    refresh();
    setModal(false);
  }

  async function removeCampaign(id, name) {
    if (!confirm(`Delete campaign "${name}"?`)) return;
    await CampaignDB.remove(id);
    logActivity('Deleted', 'Campaign', name);
    toast('Campaign deleted', 'info');
    refresh();
    if (detail?.id === id) setDetail(null);
  }

  function handleExport() {
    exportToCSV(filtered, 'vigor_campaigns.csv', {
      name: 'Campaign', clientName: 'Client', campaignType: 'Type', status: 'Status',
      budget: 'Budget', spent: 'Spent', startDate: 'Start', endDate: 'End', assignedToName: 'Assigned To'
    });
    toast('Campaigns exported', 'success');
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Campaigns</h1>
          <p className="text-sm text-muted">Plan, track, and manage all marketing campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> New Campaign</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <div className="kpi-card" style={{ '--kpi-accent': '#3b82f6', '--kpi-bg': '#eff6ff' }}>
          <div className="kpi-icon"><Megaphone size={18} /></div>
          <div className="kpi-value">{campaigns.length}</div>
          <div className="kpi-label">Total Campaigns</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-bg': '#ecfdf5' }}>
          <div className="kpi-icon"><Target size={18} /></div>
          <div className="kpi-value">{activeCampaigns.length}</div>
          <div className="kpi-label">Active</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#7c3aed', '--kpi-bg': '#f5f3ff' }}>
          <div className="kpi-icon"><DollarSign size={18} /></div>
          <div className="kpi-value">{formatINR(totalBudget)}</div>
          <div className="kpi-label">Total Budget</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-bg': '#fffbeb' }}>
          <div className="kpi-icon"><TrendingUp size={18} /></div>
          <div className="kpi-value">{formatINR(totalSpent)}</div>
          <div className="kpi-label">Total Spent</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': totalBudget > 0 ? (totalSpent/totalBudget > 0.9 ? '#ef4444' : '#10b981') : '#10b981', '--kpi-bg': '#ecfdf5' }}>
          <div className="kpi-icon"><BarChart3 size={18} /></div>
          <div className="kpi-value">{totalBudget > 0 ? Math.round((totalSpent/totalBudget)*100) : 0}%</div>
          <div className="kpi-label">Budget Utilization</div>
        </div>
      </div>

      {/* Status Pills */}
      <div className="lead-pipeline-pills" style={{ marginBottom: 16 }}>
        {CAMPAIGN_STATUSES.map(s => (
          <button key={s}
            className={`pipeline-pill ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            style={{ '--pill-color': s === 'planning' ? '#6b7280' : s === 'active' ? '#3b82f6' : s === 'in_progress' ? '#ea580c' : s === 'content_approval' ? '#7c3aed' : s === 'live' ? '#10b981' : s === 'completed' ? '#0f766e' : '#ef4444' }}
          >
            <span className="pill-label">{CAMPAIGN_STATUS_LABELS[s]}</span>
            <span className="pill-count">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="search-wrap" style={{ maxWidth: 300 }}>
          <Search size={14} />
          <input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Campaign Cards Grid */}
      <div className="campaign-grid">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <Megaphone size={40} />
            <div className="empty-state-title">No campaigns found</div>
            <div className="empty-state-text">Create your first campaign to get started.</div>
          </div>
        )}
        {filtered.map(c => {
          const budgetPct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
          const statusColor = c.status === 'planning' ? '#6b7280' : c.status === 'active' ? '#3b82f6' : c.status === 'in_progress' ? '#ea580c' : c.status === 'content_approval' ? '#7c3aed' : c.status === 'live' ? '#10b981' : c.status === 'completed' ? '#0f766e' : '#ef4444';
          return (
            <div key={c.id} className="campaign-card" onClick={() => setDetail(c)} style={{ '--camp-color': statusColor }}>
              <div className="campaign-card-head">
                <div style={{ flex: 1 }}>
                  <div className="campaign-card-name">{c.name}</div>
                  {c.clientName && <div className="campaign-card-client">{c.clientName}</div>}
                </div>
                <span className={`badge ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
              </div>
              <div className="campaign-card-meta">
                {c.campaignType && <span className="chip">{c.campaignType}</span>}
                {c.startDate && <span className="text-xs text-muted"><Calendar size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> {formatDate(c.startDate)}</span>}
              </div>
              {c.budget > 0 && (
                <div className="campaign-budget-bar">
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="text-xs text-muted">Budget: {formatINR(c.budget)}</span>
                    <span className="text-xs" style={{ fontWeight: 700, color: budgetPct > 90 ? 'var(--danger)' : 'var(--success)' }}>{budgetPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? 'var(--danger)' : statusColor }} />
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>Spent: {formatINR(c.spent || 0)}</div>
                </div>
              )}
              <div className="campaign-card-footer">
                {c.assignedToName && <span className="text-xs"><Users size={11} /> {c.assignedToName}</span>}
                <div className="row-actions" style={{ opacity: 1 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(c); }}><Edit2 size={12} /></button>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={e => { e.stopPropagation(); removeCampaign(c.id, c.name); }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{detail.name}</div>
                {detail.clientName && <div className="text-xs text-muted">{detail.clientName}</div>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => { openEdit(detail); setDetail(null); }}><Edit2 size={12} /> Edit</button>
                <button className="modal-close" onClick={() => setDetail(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
              <button className={`detail-tab ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>
                <Megaphone size={13} /> Info
              </button>
              <button className={`detail-tab ${detailTab === 'comments' ? 'active' : ''}`} onClick={() => setDetailTab('comments')}>
                <MessageSquare size={13} /> Notes
              </button>
              <button className={`detail-tab ${detailTab === 'files' ? 'active' : ''}`} onClick={() => setDetailTab('files')}>
                <Paperclip size={13} /> Files
              </button>
            </div>

            <div className="modal-body">
              {detailTab === 'info' && (
                <>
                  <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                    <div className="detail-field"><label>Type</label><span>{detail.campaignType || '—'}</span></div>
                    <div className="detail-field"><label>Status</label><span className={`badge ${CAMPAIGN_STATUS_COLORS[detail.status]}`}>{CAMPAIGN_STATUS_LABELS[detail.status]}</span></div>
                    <div className="detail-field"><label>Start Date</label><span><Calendar size={12} /> {detail.startDate ? formatDate(detail.startDate) : '—'}</span></div>
                    <div className="detail-field"><label>End Date</label><span><Calendar size={12} /> {detail.endDate ? formatDate(detail.endDate) : '—'}</span></div>
                    <div className="detail-field"><label>Budget</label><span style={{ fontWeight: 700 }}>{formatINR(detail.budget || 0)}</span></div>
                    <div className="detail-field"><label>Spent</label><span style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatINR(detail.spent || 0)}</span></div>
                    <div className="detail-field"><label>Assigned To</label><span><Users size={12} /> {detail.assignedToName || '—'}</span></div>
                    <div className="detail-field"><label>Added By</label><span>{detail.addedByName || '—'}</span></div>
                  </div>
                  {detail.brief && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="form-label">Campaign Brief</label>
                      <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.brief}</div>
                    </div>
                  )}
                  {detail.deliverables && (
                    <div>
                      <label className="form-label">Deliverables</label>
                      <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.deliverables}</div>
                    </div>
                  )}
                  {/* Quick Status Change */}
                  <div style={{ marginTop: 16 }}>
                    <label className="form-label" style={{ marginBottom: 8 }}>Move to Stage</label>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {CAMPAIGN_STATUSES.filter(s => s !== detail.status).map(s => (
                        <button key={s} className="btn btn-sm btn-secondary" onClick={async () => {
                          await CampaignDB.update(detail.id, { status: s });
                          logActivity('Moved', 'Campaign', detail.name, `→ ${CAMPAIGN_STATUS_LABELS[s]}`);
                          refresh();
                          setDetail({ ...detail, status: s });
                        }}>
                          <ArrowRight size={11} /> {CAMPAIGN_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {detailTab === 'comments' && (
                <CommentPanel recordType="campaign" recordId={detail.id} />
              )}
              {detailTab === 'files' && (
                <AttachmentsPanel recordType="campaign" recordId={detail.id} recordName={detail.name} />
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
              <span className="modal-title">{editId ? 'Edit Campaign' : 'New Campaign'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Campaign Name <span className="req">*</span></label>
                  <input className="input" placeholder="e.g. Glowtone Product Launch" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="select" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.brandName}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Campaign Type</label>
                  <select className="select" value={form.campaignType} onChange={e => setForm({ ...form, campaignType: e.target.value })}>
                    <option value="">Select type</option>
                    {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Budget (₹)</label>
                  <input className="input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Spent (₹)</label>
                  <input className="input" type="number" value={form.spent} onChange={e => setForm({ ...form, spent: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned To</label>
                <MultiAssignSelect
                  value={Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : [])}
                  onChange={val => setForm({ ...form, assignedTo: val })}
                  users={users}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Campaign Brief</label>
                <textarea className="textarea" placeholder="Describe the campaign objectives..." value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Deliverables</label>
                <textarea className="textarea" placeholder="List expected deliverables..." value={form.deliverables} onChange={e => setForm({ ...form, deliverables: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Create Campaign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
