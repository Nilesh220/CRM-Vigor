import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import {
  EventDB, ClientDB, VendorDB, getAllUsers, genId, logActivity,
  formatINR, formatDate, searchFilter, exportToCSV, ZONES,
  EVENT_STATUSES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_TYPES
} from '../lib/data';
import CommentPanel from '../components/ui/CommentPanel';
import {
  Plus, Search, Download, CalendarDays, MapPin, DollarSign,
  Edit2, Trash2, X, Building2, Users, Clock, ArrowRight, Zap, MessageSquare
} from 'lucide-react';

export default function Events() {
  const session = useSession();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [form, setForm] = useState({
    name: '', eventType: '', clientId: '', clientName: '', venue: '',
    city: '', state: '', zone: '', startDate: '', endDate: '',
    budget: '', spent: '', status: 'planning', notes: '',
    assignedTo: '', assignedToName: ''
  });

  const users = getAllUsers();

  useEffect(() => {
    EventDB.syncFromDB().then(rows => setEvents(rows));
    ClientDB.syncFromDB().then(rows => setClients(rows));
  }, []);

  const refresh = () => setEvents(EventDB.all());

  const filtered = searchFilter(
    events.filter(e => {
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterType && e.eventType !== filterType) return false;
      return true;
    }), search, ['name', 'clientName', 'venue', 'city', 'eventType']
  );

  // KPI
  const totalBudget = events.reduce((s, e) => s + (e.budget || 0), 0);
  const totalSpent = events.reduce((s, e) => s + (e.spent || 0), 0);
  const upcomingCount = events.filter(e => e.startDate && new Date(e.startDate) > new Date()).length;
  const statusCounts = EVENT_STATUSES.reduce((acc, s) => {
    acc[s] = events.filter(e => e.status === s).length;
    return acc;
  }, {});

  function openAdd() {
    setEditId(null);
    setForm({
      name: '', eventType: '', clientId: '', clientName: '', venue: '',
      city: '', state: '', zone: '', startDate: '', endDate: '',
      budget: '', spent: '', status: 'planning', notes: '',
      assignedTo: '', assignedToName: ''
    });
    setModal(true);
  }

  function openEdit(ev) {
    setEditId(ev.id);
    setForm({
      name: ev.name || '', eventType: ev.eventType || '',
      clientId: ev.clientId || '', clientName: ev.clientName || '',
      venue: ev.venue || '', city: ev.city || '', state: ev.state || '',
      zone: ev.zone || '', startDate: ev.startDate || '', endDate: ev.endDate || '',
      budget: ev.budget || '', spent: ev.spent || '', status: ev.status || 'planning',
      notes: ev.notes || '', assignedTo: ev.assignedTo || '', assignedToName: ev.assignedToName || ''
    });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) { toast('Event name is required', 'warning'); return; }
    const client = clients.find(c => c.id === form.clientId);
    const assignee = users.find(u => u.id === form.assignedTo);
    const payload = {
      ...form,
      clientName: client?.brandName || form.clientName || '',
      assignedToName: assignee?.name || form.assignedTo || '',
      budget: parseFloat(form.budget) || 0,
      spent: parseFloat(form.spent) || 0,
      addedBy: session?.id,
      addedByName: session?.name
    };
    if (editId) {
      await EventDB.update(editId, payload);
      logActivity('Updated', 'Event', form.name);
      toast('Event updated', 'success');
    } else {
      payload.id = genId('evt');
      await EventDB.add(payload);
      logActivity('Created', 'Event', form.name);
      toast('Event created', 'success');
    }
    refresh();
    setModal(false);
  }

  async function removeEvent(id, name) {
    if (!confirm(`Delete event "${name}"?`)) return;
    await EventDB.remove(id);
    logActivity('Deleted', 'Event', name);
    toast('Event deleted', 'info');
    refresh();
    if (detail?.id === id) setDetail(null);
  }

  function handleExport() {
    exportToCSV(filtered, 'vigor_events.csv', {
      name: 'Event', eventType: 'Type', clientName: 'Client', venue: 'Venue',
      city: 'City', status: 'Status', budget: 'Budget', spent: 'Spent',
      startDate: 'Start', endDate: 'End'
    });
    toast('Events exported', 'success');
  }

  function getEventStatusColor(s) {
    return s === 'planning' ? '#6b7280' : s === 'confirmed' ? '#3b82f6' : s === 'in_progress' ? '#ea580c' : s === 'completed' ? '#10b981' : '#ef4444';
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Events</h1>
          <p className="text-sm text-muted">Plan and manage activations, launches, and corporate events.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> New Event</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <div className="kpi-card" style={{ '--kpi-accent': '#3b82f6', '--kpi-bg': '#eff6ff' }}>
          <div className="kpi-icon"><CalendarDays size={18} /></div>
          <div className="kpi-value">{events.length}</div>
          <div className="kpi-label">Total Events</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-bg': '#ecfdf5' }}>
          <div className="kpi-icon"><Clock size={18} /></div>
          <div className="kpi-value">{upcomingCount}</div>
          <div className="kpi-label">Upcoming</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#7c3aed', '--kpi-bg': '#f5f3ff' }}>
          <div className="kpi-icon"><DollarSign size={18} /></div>
          <div className="kpi-value">{formatINR(totalBudget)}</div>
          <div className="kpi-label">Total Budget</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-bg': '#fffbeb' }}>
          <div className="kpi-icon"><Zap size={18} /></div>
          <div className="kpi-value">{formatINR(totalSpent)}</div>
          <div className="kpi-label">Total Spent</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="search-wrap" style={{ maxWidth: 300 }}>
          <Search size={14} />
          <input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {EVENT_STATUSES.map(s => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}
        </select>
        <select className="select" style={{ width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Event Cards Grid */}
      <div className="campaign-grid">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <CalendarDays size={40} />
            <div className="empty-state-title">No events found</div>
            <div className="empty-state-text">Create your first event to get started.</div>
          </div>
        )}
        {filtered.map(ev => {
          const budgetPct = ev.budget > 0 ? Math.min(100, Math.round((ev.spent / ev.budget) * 100)) : 0;
          const statusColor = getEventStatusColor(ev.status);
          return (
            <div key={ev.id} className="campaign-card" onClick={() => setDetail(ev)} style={{ '--camp-color': statusColor }}>
              <div className="campaign-card-head">
                <div style={{ flex: 1 }}>
                  <div className="campaign-card-name">{ev.name}</div>
                  {ev.clientName && <div className="campaign-card-client">{ev.clientName}</div>}
                </div>
                <span className={`badge ${EVENT_STATUS_COLORS[ev.status]}`}>{EVENT_STATUS_LABELS[ev.status]}</span>
              </div>
              <div className="campaign-card-meta">
                {ev.eventType && <span className="chip">{ev.eventType}</span>}
                {(ev.city || ev.venue) && (
                  <span className="text-xs text-muted"><MapPin size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> {ev.venue ? ev.venue + ', ' : ''}{ev.city || ''}</span>
                )}
              </div>
              {ev.startDate && (
                <div className="text-xs text-muted" style={{ margin: '6px 0' }}>
                  <CalendarDays size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> {formatDate(ev.startDate)}
                  {ev.endDate && <> → {formatDate(ev.endDate)}</>}
                </div>
              )}
              {ev.budget > 0 && (
                <div className="campaign-budget-bar">
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="text-xs text-muted">Budget: {formatINR(ev.budget)}</span>
                    <span className="text-xs" style={{ fontWeight: 700, color: budgetPct > 90 ? 'var(--danger)' : 'var(--success)' }}>{budgetPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? 'var(--danger)' : statusColor }} />
                  </div>
                </div>
              )}
              <div className="campaign-card-footer">
                {ev.assignedToName && <span className="text-xs"><Users size={11} /> {ev.assignedToName}</span>}
                <div className="row-actions" style={{ opacity: 1 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(ev); }}><Edit2 size={12} /></button>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={e => { e.stopPropagation(); removeEvent(ev.id, ev.name); }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
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
                <CalendarDays size={13} /> Info
              </button>
              <button className={`detail-tab ${detailTab === 'comments' ? 'active' : ''}`} onClick={() => setDetailTab('comments')}>
                <MessageSquare size={13} /> Notes
              </button>
            </div>

            <div className="modal-body">
              {detailTab === 'info' && (
                <>
                  <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                    <div className="detail-field"><label>Type</label><span>{detail.eventType || '—'}</span></div>
                    <div className="detail-field"><label>Status</label><span className={`badge ${EVENT_STATUS_COLORS[detail.status]}`}>{EVENT_STATUS_LABELS[detail.status]}</span></div>
                    <div className="detail-field"><label>Venue</label><span><MapPin size={12} /> {detail.venue || '—'}</span></div>
                    <div className="detail-field"><label>City</label><span>{detail.city || '—'}</span></div>
                    <div className="detail-field"><label>Start</label><span><CalendarDays size={12} /> {detail.startDate ? formatDate(detail.startDate) : '—'}</span></div>
                    <div className="detail-field"><label>End</label><span><CalendarDays size={12} /> {detail.endDate ? formatDate(detail.endDate) : '—'}</span></div>
                    <div className="detail-field"><label>Budget</label><span style={{ fontWeight: 700 }}>{formatINR(detail.budget || 0)}</span></div>
                    <div className="detail-field"><label>Spent</label><span style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatINR(detail.spent || 0)}</span></div>
                  </div>
                  {detail.notes && (
                    <div>
                      <label className="form-label">Notes</label>
                      <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.notes}</div>
                    </div>
                  )}
                  {/* Quick Status Change */}
                  <div style={{ marginTop: 16 }}>
                    <label className="form-label" style={{ marginBottom: 8 }}>Move to Stage</label>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {EVENT_STATUSES.filter(s => s !== detail.status).map(s => (
                        <button key={s} className="btn btn-sm btn-secondary" onClick={async () => {
                          await EventDB.update(detail.id, { status: s });
                          logActivity('Moved', 'Event', detail.name, `→ ${EVENT_STATUS_LABELS[s]}`);
                          refresh();
                          setDetail({ ...detail, status: s });
                        }}>
                          <ArrowRight size={11} /> {EVENT_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {detailTab === 'comments' && (
                <CommentPanel recordType="event" recordId={detail.id} />
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
              <span className="modal-title">{editId ? 'Edit Event' : 'New Event'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Event Name <span className="req">*</span></label>
                  <input className="input" placeholder="e.g. Campus Launch — IIT Delhi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select className="select" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}>
                    <option value="">Select type</option>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="select" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.brandName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {EVENT_STATUSES.map(s => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="input" placeholder="Venue name" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="input" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
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
                <select className="select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
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
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Create Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
