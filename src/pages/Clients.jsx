import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import {
  ClientDB, LeadDB, CampaignDB, RevenueDB, getAllUsers, genId, logActivity,
  formatINR, formatDate, searchFilter, exportToCSV
} from '../lib/data';
import CommentPanel from '../components/ui/CommentPanel';
import AttachmentsPanel from '../components/ui/AttachmentsPanel';
import {
  Plus, Search, Download, Building2, User, Mail, Phone, FileText,
  Calendar, DollarSign, Edit2, Trash2, X, Shield, TrendingUp, Eye,
  MessageSquare, Paperclip
} from 'lucide-react';

const STATUS_COLORS = { active: 'badge-green', inactive: 'badge-gray', churned: 'badge-red' };
const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', churned: 'Churned' };

export default function Clients() {
  const session = useSession();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [form, setForm] = useState({
    brandName: '', companyName: '', pocName: '', pocEmail: '', pocPhone: '',
    category: '', brandType: '', gstNumber: '', billingAddress: '',
    contractStart: '', contractEnd: '', contractValue: '', status: 'active',
    notes: '', leadId: ''
  });

  const users = getAllUsers();

  useEffect(() => {
    ClientDB.syncFromDB().then(rows => setClients(rows));
  }, []);

  const refresh = () => setClients(ClientDB.all());

  const filtered = searchFilter(
    clients.filter(c => !filterStatus || c.status === filterStatus),
    search, ['brandName', 'companyName', 'pocName', 'pocEmail']
  );

  // Revenue per client
  const revenues = RevenueDB.all();
  const campaigns = CampaignDB.all();
  const getClientRevenue = (clientId) => revenues.filter(r => r.clientId === clientId).reduce((s, r) => s + (r.amount || 0), 0);
  const getClientCampaigns = (clientId) => campaigns.filter(c => c.clientId === clientId).length;

  // Summary stats
  const totalContractValue = clients.reduce((s, c) => s + (c.contractValue || 0), 0);
  const activeCount = clients.filter(c => c.status === 'active').length;

  function openAdd() {
    setEditId(null);
    setForm({
      brandName: '', companyName: '', pocName: '', pocEmail: '', pocPhone: '',
      category: '', brandType: '', gstNumber: '', billingAddress: '',
      contractStart: '', contractEnd: '', contractValue: '', status: 'active',
      notes: '', leadId: ''
    });
    setModal(true);
  }

  function openEdit(client) {
    setEditId(client.id);
    setForm({
      brandName: client.brandName || '', companyName: client.companyName || '',
      pocName: client.pocName || '', pocEmail: client.pocEmail || '',
      pocPhone: client.pocPhone || '', category: client.category || '',
      brandType: client.brandType || '', gstNumber: client.gstNumber || '',
      billingAddress: client.billingAddress || '',
      contractStart: client.contractStart || '', contractEnd: client.contractEnd || '',
      contractValue: client.contractValue || '', status: client.status || 'active',
      notes: client.notes || '', leadId: client.leadId || ''
    });
    setModal(true);
  }

  async function save() {
    if (!form.brandName.trim()) { toast('Brand name is required', 'warning'); return; }
    const payload = {
      ...form,
      contractValue: parseFloat(form.contractValue) || 0,
      addedBy: session?.id,
      addedByName: session?.name
    };
    if (editId) {
      await ClientDB.update(editId, payload);
      logActivity('Updated', 'Client', form.brandName);
      toast('Client updated', 'success');
    } else {
      payload.id = genId('client');
      await ClientDB.add(payload);
      logActivity('Created', 'Client', form.brandName);
      toast('Client added', 'success');
    }
    refresh();
    setModal(false);
  }

  async function removeClient(id, name) {
    if (!confirm(`Delete client "${name}"?`)) return;
    await ClientDB.remove(id);
    logActivity('Deleted', 'Client', name);
    toast('Client deleted', 'info');
    refresh();
    if (detail?.id === id) setDetail(null);
  }

  function handleExport() {
    exportToCSV(filtered, 'vigor_clients.csv', {
      brandName: 'Brand Name', companyName: 'Company', pocName: 'POC', pocEmail: 'Email',
      pocPhone: 'Phone', category: 'Category', status: 'Status', contractValue: 'Contract Value',
      contractStart: 'Contract Start', contractEnd: 'Contract End'
    });
    toast('Clients exported', 'success');
  }

  // Convert won lead to client
  function convertLeadToClient(lead) {
    setForm({
      brandName: lead.brandName || '', companyName: '', pocName: lead.pocName || '',
      pocEmail: lead.pocEmail || '', pocPhone: lead.pocPhone || '',
      category: lead.category || '', brandType: lead.brandType || '',
      gstNumber: '', billingAddress: '', contractStart: '', contractEnd: '',
      contractValue: lead.dealValue || '', status: 'active', notes: '', leadId: lead.id
    });
    setEditId(null);
    setModal(true);
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Clients</h1>
          <p className="text-sm text-muted">Manage confirmed clients, contracts, and revenue.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> New Client</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card" style={{ '--kpi-accent': '#3b82f6', '--kpi-bg': '#eff6ff' }}>
          <div className="kpi-icon"><Building2 size={18} /></div>
          <div className="kpi-value">{clients.length}</div>
          <div className="kpi-label">Total Clients</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-bg': '#ecfdf5' }}>
          <div className="kpi-icon"><Shield size={18} /></div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-label">Active Clients</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#7c3aed', '--kpi-bg': '#f5f3ff' }}>
          <div className="kpi-icon"><DollarSign size={18} /></div>
          <div className="kpi-value">{formatINR(totalContractValue)}</div>
          <div className="kpi-label">Total Contract Value</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-bg': '#fffbeb' }}>
          <div className="kpi-icon"><TrendingUp size={18} /></div>
          <div className="kpi-value">{campaigns.filter(c => !['completed', 'cancelled'].includes(c.status)).length}</div>
          <div className="kpi-label">Active Campaigns</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="search-wrap" style={{ maxWidth: 300 }}>
          <Search size={14} />
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Brand / Company</th>
              <th>POC</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Contract Value</th>
              <th>Contract Period</th>
              <th>Campaigns</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No clients found</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(c)}>
                <td>
                  <div className="cell-primary">{c.brandName}</div>
                  {c.companyName && <div className="cell-sub">{c.companyName}</div>}
                </td>
                <td>{c.pocName || '—'}</td>
                <td style={{ fontSize: '.78rem', color: 'var(--text-2)' }}>{c.pocEmail || '—'}</td>
                <td style={{ fontSize: '.78rem' }}>{c.pocPhone || '—'}</td>
                <td style={{ fontWeight: 600 }}>{c.contractValue ? formatINR(c.contractValue) : '—'}</td>
                <td className="text-xs">
                  {c.contractStart ? formatDate(c.contractStart) : '—'} → {c.contractEnd ? formatDate(c.contractEnd) : '—'}
                </td>
                <td>
                  <span className="badge badge-blue">{getClientCampaigns(c.id)}</span>
                </td>
                <td><span className={`badge ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-icon btn-ghost" onClick={e => { e.stopPropagation(); openEdit(c); }}><Edit2 size={13} /></button>
                    <button className="btn btn-icon btn-ghost" onClick={e => { e.stopPropagation(); removeClient(c.id, c.brandName); }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{detail.brandName}</div>
                {detail.companyName && <div className="text-xs text-muted">{detail.companyName}</div>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => { openEdit(detail); setDetail(null); }}><Edit2 size={12} /> Edit</button>
                <button className="modal-close" onClick={() => setDetail(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
              <button className={`detail-tab ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>
                <Building2 size={13} /> Info
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
                    <div className="detail-field"><label>POC</label><span><User size={12} /> {detail.pocName || '—'}</span></div>
                    <div className="detail-field"><label>Phone</label><span><Phone size={12} /> {detail.pocPhone || '—'}</span></div>
                    <div className="detail-field"><label>Email</label><span><Mail size={12} /> {detail.pocEmail || '—'}</span></div>
                    <div className="detail-field"><label>Status</label><span className={`badge ${STATUS_COLORS[detail.status]}`}>{STATUS_LABELS[detail.status]}</span></div>
                    <div className="detail-field"><label>Contract Value</label><span style={{ fontWeight: 700, color: 'var(--success)' }}>{detail.contractValue ? formatINR(detail.contractValue) : '—'}</span></div>
                    <div className="detail-field"><label>GST Number</label><span>{detail.gstNumber || '—'}</span></div>
                    <div className="detail-field"><label>Contract Start</label><span><Calendar size={12} /> {detail.contractStart ? formatDate(detail.contractStart) : '—'}</span></div>
                    <div className="detail-field"><label>Contract End</label><span><Calendar size={12} /> {detail.contractEnd ? formatDate(detail.contractEnd) : '—'}</span></div>
                  </div>
                  {detail.billingAddress && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="form-label">Billing Address</label>
                      <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)' }}>{detail.billingAddress}</div>
                    </div>
                  )}
                  {detail.notes && (
                    <div>
                      <label className="form-label">Notes</label>
                      <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 'var(--r-sm)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{detail.notes}</div>
                    </div>
                  )}
                </>
              )}
              {detailTab === 'comments' && (
                <CommentPanel recordType="client" recordId={detail.id} />
              )}
              {detailTab === 'files' && (
                <AttachmentsPanel recordType="client" recordId={detail.id} recordName={detail.brandName} />
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
              <span className="modal-title">{editId ? 'Edit Client' : 'New Client'}</span>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Brand Name <span className="req">*</span></label>
                  <input className="input" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">POC Name</label>
                  <input className="input" value={form.pocName} onChange={e => setForm({ ...form, pocName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" value={form.pocEmail} onChange={e => setForm({ ...form, pocEmail: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="input" value={form.pocPhone} onChange={e => setForm({ ...form, pocPhone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input className="input" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contract Value (₹)</label>
                  <input className="input" type="number" value={form.contractValue} onChange={e => setForm({ ...form, contractValue: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contract Start</label>
                  <input className="input" type="date" value={form.contractStart} onChange={e => setForm({ ...form, contractStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contract End</label>
                  <input className="input" type="date" value={form.contractEnd} onChange={e => setForm({ ...form, contractEnd: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <textarea className="textarea" value={form.billingAddress} onChange={e => setForm({ ...form, billingAddress: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Add Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
