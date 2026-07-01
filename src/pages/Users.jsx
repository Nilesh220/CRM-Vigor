import { useState, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import { useToast, useSession } from '../contexts/AppContext';
import { getAllUsers, saveUsers, ROLE_LABELS, ROLE_NAV, genId, logActivity, upsertUserToDB, deleteUserFromDB, syncUsersFromDB, ZONES, getZoneBadgeClass, getUserZones, PayslipDB } from '../lib/data';
import { Users as UsersIcon, Plus, Search, Shield, UserX, UserCheck, Key, Edit2, Trash2, CheckSquare, Printer, Coins, Download, Eye } from 'lucide-react';

const ROLES = ['admin', 'founder', 'hr', 'finance', 'vigorspace', 'influencer', 'operations', 'pm'];
const ROLE_COLORS = {
  admin:      'badge-red',
  founder:    'badge-purple',
  hr:         'badge-blue',
  finance:    'badge-green',
  vigorspace: 'badge-navy',
  influencer: 'badge-yellow',
  operations: 'badge-teal',
  pm:         'badge-gray',
};

export default function Users() {
  const toast = useToast();
  const session = useSession();
  const [users, setUsers] = useState(() => getAllUsers());
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'vigorspace', dept: '', zones: [],
    exportAccess: false, allowedNav: [], permissions: {},
    // Personal & payroll fields
    mobile: '', pan: '', aadhar: '', dateJoining: '',
    bankName: '', bankAccount: '', ifsc: ''
  });
  const [tab, setTab] = useState(0);
  const [onboardingList, setOnboardingList] = useState([
    { id: 1, text: 'Collect Govt ID (PAN/Aadhaar) & Bank Details', done: true, category: 'Documentation' },
    { id: 2, text: 'Sign Employment Contract & NDA', done: true, category: 'Legal' },
    { id: 3, text: 'Provision G-Suite / Work Email Address', done: false, category: 'IT Setup' },
    { id: 4, text: 'Create Vigor CRM Portal Login & assign role keys', done: false, category: 'IT Setup' },
    { id: 5, text: 'Invite to Slack Workspace & Campaign folders', done: false, category: 'IT Setup' },
    { id: 6, text: 'Send Vigor Onboarding Welcome Kit & Merch', done: false, category: 'HR Merch' },
    { id: 7, text: 'Schedule 1-on-1 team lead introduction call', done: false, category: 'Training' },
  ]);

  const [payslips, setPayslips] = useState([]);
  const [selectedUserForPay, setSelectedUserForPay] = useState('');
  const [payrollForm, setPayrollForm] = useState({
    monthYear: 'May 2026', empCode: '008', standardDays: 31, daysWorked: 31, lateMark: 0,
    paymentMode: 'Bank Transfer', bankName: 'HDFC', bankAccount: '', ifsc: '',
    pan: '', aadhar: '', mobile: '',
    basicSalary: 20000, hra: 10000, medical: 5000, conveyance: 2500, specialAllowance: 2500,
    tds: 0, professionalTax: 200, otherDeduction: 0
  });
  const [selectedPayslipPreview, setSelectedPayslipPreview] = useState(null);
  const [previewModal, setPreviewModal] = useState(false);
  // Payslip branding uploads (stored as data URLs, session-only)
  const [slipLogo, setSlipLogo] = useState(null);
  const [slipStamp, setSlipStamp] = useState(null);
  const [slipSignature, setSlipSignature] = useState(null);

  function handleImageUpload(setter) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setter(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  }

  const refresh = () => setUsers(getAllUsers());
  const refreshPayslips = () => setPayslips(PayslipDB.all());

  useEffect(() => {
    syncUsersFromDB().then(() => setUsers(getAllUsers()));
    PayslipDB.syncFromDB().then(rows => setPayslips(rows));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && ![u.name, u.email, u.role, u.dept||''].join(' ').toLowerCase().includes(q)) return false;
    if (filterRole && u.role !== filterRole) return false;
    return true;
  });

  function openAdd() {
    setEditId(null);
    setForm({
      name: '', email: '', password: '', role: 'vigorspace', dept: '', zones: [],
      exportAccess: false, allowedNav: [...(ROLE_NAV['vigorspace'] || [])], permissions: {},
      mobile: '', pan: '', aadhar: '', dateJoining: '',
      bankName: '', bankAccount: '', ifsc: ''
    });
    setModal(true);
  }

  function openEdit(u) {
    setEditId(u.id);
    // Normalize zones to array (support legacy single zone string)
    const zones = Array.isArray(u.zones) && u.zones.length
      ? u.zones
      : (u.zone ? [u.zone] : []);
    setForm({
      name: u.name, email: u.email, password: '', role: u.role,
      dept: u.dept||'', zones, exportAccess: u.exportAccess||false,
      allowedNav: [...(u.allowedNav || ROLE_NAV[u.role] || [])], permissions: u.permissions || {},
      mobile: u.mobile||'', pan: u.pan||'', aadhar: u.aadhar||'',
      dateJoining: u.dateJoining||'',
      bankName: u.bankName||'', bankAccount: u.bankAccount||'', ifsc: u.ifsc||''
    });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required.', 'warning');
      return;
    }
    const all = getAllUsers();
    if (editId) {
      const idx = all.findIndex(u => u.id === editId);
      if (idx > -1) {
        all[idx] = {
          ...all[idx],
          name: form.name,
          email: form.email,
          role: form.role,
          dept: form.dept,
          zones: form.zones || [],
          zone: (form.zones && form.zones[0]) || null, // keep legacy for compat
          exportAccess: form.exportAccess,
          allowedNav: form.allowedNav,
          permissions: form.permissions || {},
          mobile: form.mobile||'', pan: form.pan||'', aadhar: form.aadhar||'',
          dateJoining: form.dateJoining||'',
          bankName: form.bankName||'', bankAccount: form.bankAccount||'', ifsc: form.ifsc||''
        };
        if (form.password) all[idx].password = form.password;
        saveUsers(all);
        logActivity('Updated', 'User', form.name, ROLE_LABELS[form.role] || form.role);
        toast('User updated!', 'success');
        upsertUserToDB(all[idx]);
      }
    } else {
      if (!form.password) {
        toast('Password is required for new users.', 'warning');
        return;
      }
      if (all.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
        toast('Email already exists.', 'error');
        return;
      }
      const newUser = {
        id: genId('u'),
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        dept: form.dept,
        zones: form.zones || [],
        zone: (form.zones && form.zones[0]) || null,
        exportAccess: form.exportAccess,
        allowedNav: form.allowedNav,
        permissions: form.permissions || {},
        mobile: form.mobile||'', pan: form.pan||'', aadhar: form.aadhar||'',
        dateJoining: form.dateJoining||'',
        bankName: form.bankName||'', bankAccount: form.bankAccount||'', ifsc: form.ifsc||''
      };
      all.push(newUser);
      saveUsers(all);
      logActivity('Created', 'User', form.name, ROLE_LABELS[form.role] || form.role);
      toast('User created!', 'success');
      upsertUserToDB(newUser);
    }
    setModal(false);
    refresh();
  }

  function toggleExport(u) {
    const all = getAllUsers();
    const idx = all.findIndex(x => x.id === u.id);
    if (idx > -1) {
      const val = !all[idx].exportAccess;
      all[idx].exportAccess = val;
      saveUsers(all);
      logActivity('Updated', 'User', u.name, `Export access ${val ? 'enabled' : 'disabled'}`);
      toast(`Export access ${val ? 'enabled' : 'disabled'} for ${u.name}.`, 'success');
      refresh();
    }
  }

  async function del(id, name) {
    if (id === session?.id) {
      toast('You cannot delete your own account.', 'error');
      return;
    }
    if (!confirm(`Delete user "${name}" permanently?`)) return;
    const all = getAllUsers().filter(u => u.id !== id);
    saveUsers(all);
    deleteUserFromDB(id);
    logActivity('Deleted', 'User', name);
    toast('User deleted.', 'success');
    refresh();
  }

  async function generatePayslip() {
    if (!selectedUserForPay) { toast('Please select an employee', 'warning'); return; }
    const user = users.find(u => u.id === selectedUserForPay);
    if (!user) return;

    const basic = parseFloat(payrollForm.basicSalary) || 0;
    const hra = parseFloat(payrollForm.hra) || 0;
    const medical = parseFloat(payrollForm.medical) || 0;
    const conveyance = parseFloat(payrollForm.conveyance) || 0;
    const spec = parseFloat(payrollForm.specialAllowance) || 0;

    const tds = parseFloat(payrollForm.tds) || 0;
    const pt = parseFloat(payrollForm.professionalTax) || 0;
    const other = parseFloat(payrollForm.otherDeduction) || 0;

    const gross = basic + hra + medical + conveyance + spec;
    const totalDeductions = tds + pt + other;
    const net = gross - totalDeductions;

    const payload = {
      id: genId('pay'),
      userId: user.id,
      userName: user.name,
      monthYear: payrollForm.monthYear,
      empCode: payrollForm.empCode,
      designation: ROLE_LABELS[user.role] || user.role,
      department: user.dept || 'Operations',
      dateJoining: user.dateJoining || '', // Use actual user data
      pan: payrollForm.pan,
      aadhar: payrollForm.aadhar,
      mobile: payrollForm.mobile,
      standardDays: parseInt(payrollForm.standardDays) || 31,
      daysWorked: parseInt(payrollForm.daysWorked) || 31,
      lateMark: parseInt(payrollForm.lateMark) || 0,
      paymentMode: payrollForm.paymentMode,
      bankName: payrollForm.bankName,
      bankAccount: payrollForm.bankAccount,
      ifsc: payrollForm.ifsc,
      basicSalary: basic,
      hra: hra,
      medical: medical,
      conveyance: conveyance,
      specialAllowance: spec,
      tds: tds,
      professionalTax: pt,
      otherDeduction: other,
      grossSalary: gross,
      totalDeductions: totalDeductions,
      netPay: net
    };

    await PayslipDB.add(payload);
    logActivity('Generated', 'Salary Slip', `${user.name} — ${payload.monthYear}`, `Net Pay: ${net}`);
    toast('Salary slip generated successfully!', 'success');
    setSelectedUserForPay('');
    refreshPayslips();
  }

  async function removePayslip(id, title) {
    if (!confirm(`Delete salary slip "${title}"?`)) return;
    await PayslipDB.remove(id);
    toast('Salary slip deleted.', 'info');
    refreshPayslips();
  }

  const kpis = [
    { label: 'Team Members', value: users.length, c: '#2563eb', bg: '#eff6ff' },
    { label: 'Admins & Founders', value: users.filter(u => ['admin', 'founder'].includes(u.role)).length, c: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'VigorSpace Team', value: users.filter(u => u.role === 'vigorspace').length, c: '#10b981', bg: '#ecfdf5' },
    { label: 'Export Access', value: users.filter(u => u.exportAccess).length, c: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">User Management</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM &rsaquo; Admin &rsaquo; Users</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {kpis.map(k => (
            <div key={k.label} className="kpi-card" style={{ '--kpi-accent': k.c }}>
              <div className="kpi-icon" style={{ background: k.bg }}><UsersIcon size={16} color={k.c} /></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn ${tab === 0 ? 'active' : ''}`} onClick={() => setTab(0)}>
            <UsersIcon size={13} style={{ marginRight: 6 }} /> Team Members
          </button>
          {['admin', 'hr', 'founder'].includes(session?.role) && (
            <>
              <button className={`tab-btn ${tab === 1 ? 'active' : ''}`} onClick={() => setTab(1)}>
                <CheckSquare size={13} style={{ marginRight: 6 }} /> HR Onboarding Toolkit
              </button>
              <button className={`tab-btn ${tab === 2 ? 'active' : ''}`} onClick={() => setTab(2)}>
                <Coins size={13} style={{ marginRight: 6 }} /> Payroll Manager
              </button>
            </>
          )}
        </div>

        {tab === 0 && (
          <div className="card">
            <div className="card-header">
              <div className="filter-row" style={{ margin: 0, flex: 1 }}>
                <div className="search-wrap" style={{ flex: '0 1 280px' }}>
                  <Search size={14} />
                  <input
                    placeholder="Search name, email, role, department…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="select"
                  style={{ width: 'auto' }}
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Zone</th>
                    <th>Export Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={u.id === session?.id ? { background: 'var(--primary-hover)' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--primary)' }}>
                            {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="cell-primary">
                              {u.name} {u.id === session?.id && <span style={{ fontSize: '.7rem', color: 'var(--primary)' }}>(you)</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.82rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>{u.dept || '—'}</td>
                      <td>
                        {(() => {
                          const userZones = Array.isArray(u.zones) && u.zones.length
                            ? u.zones
                            : (u.zone ? [u.zone] : []);
                          return userZones.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {userZones.map(z => (
                                <span key={z} className={`badge ${getZoneBadgeClass(z)}`} style={{ fontSize: '.65rem' }}>
                                  {z.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: '.78rem' }}>National</span>
                          );
                        })()}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleExport(u)}
                          style={{
                            background: u.exportAccess ? 'var(--success)' : 'var(--border)',
                            color: u.exportAccess ? 'white' : 'var(--text-3)',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '99px',
                            fontSize: '.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .15s'
                          }}
                        >
                          {u.exportAccess ? '✓ Enabled' : '✕ Disabled'}
                        </button>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(u)}>
                            <Edit2 size={14} />
                          </button>
                          {u.id !== session?.id && (
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ color: 'var(--danger)' }}
                              title="Delete"
                              onClick={() => del(u.id, u.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Employee Onboarding Checklist</div>
                <div className="card-subtitle">Track onboarding milestones for new hires</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {(() => {
                  const done = onboardingList.filter(o => o.done).length;
                  const pct = Math.round((done / onboardingList.length) * 100) || 0;
                  return (
                    <>
                      <div className="progress-track" style={{ width: 120 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--success)' }} />
                      </div>
                      <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--success)' }}>{pct}% Done ({done}/{onboardingList.length})</span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {onboardingList.map(o => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setOnboardingList(prev => prev.map(x => x.id === o.id ? { ...x, done: !x.done } : x));
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'all .15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <input
                      type="checkbox"
                      checked={o.done}
                      readOnly
                      style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '.83rem', fontWeight: 600,
                        textDecoration: o.done ? 'line-through' : 'none',
                        color: o.done ? 'var(--text-3)' : 'var(--text)'
                      }}>
                        {o.text}
                      </div>
                    </div>
                    <span className="chip" style={{ fontSize: '.65rem' }}>{o.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Generate form card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Salary Slip Generator</div>
                  <div className="card-subtitle">Generate a print-ready payslip for any team member</div>
                </div>
              </div>
              <div className="card-body">
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Select Employee <span className="req">*</span></label>
                    <select className="select" value={selectedUserForPay} onChange={e => {
                      const uid = e.target.value;
                      setSelectedUserForPay(uid);
                      const u = users.find(x => x.id === uid);
                      if (u) {
                        setPayrollForm(f => ({
                          ...f,
                          empCode: payrollForm.empCode || u.id.slice(-3),
                          mobile: u.mobile || '',
                          pan: u.pan || '',
                          aadhar: u.aadhar || '',
                          bankAccount: u.bankAccount || '',
                          ifsc: u.ifsc || '',
                          bankName: u.bankName || ''
                        }));
                      }
                    }}>
                      <option value="">Select Employee…</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Month & Year <span className="req">*</span></label>
                    <input className="input" placeholder="e.g., May 2026" value={payrollForm.monthYear} onChange={e => setPayrollForm({ ...payrollForm, monthYear: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employee Code</label>
                    <input className="input" placeholder="e.g., 008" value={payrollForm.empCode} onChange={e => setPayrollForm({ ...payrollForm, empCode: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Standard Days</label>
                    <input className="input" type="number" value={payrollForm.standardDays} onChange={e => setPayrollForm({ ...payrollForm, standardDays: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Days Worked</label>
                    <input className="input" type="number" value={payrollForm.daysWorked} onChange={e => setPayrollForm({ ...payrollForm, daysWorked: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Late Mark</label>
                    <input className="input" type="number" value={payrollForm.lateMark} onChange={e => setPayrollForm({ ...payrollForm, lateMark: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <input className="input" value={payrollForm.paymentMode} onChange={e => setPayrollForm({ ...payrollForm, paymentMode: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input className="input" value={payrollForm.bankName} onChange={e => setPayrollForm({ ...payrollForm, bankName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input className="input" value={payrollForm.bankAccount} onChange={e => setPayrollForm({ ...payrollForm, bankAccount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input className="input" value={payrollForm.ifsc} onChange={e => setPayrollForm({ ...payrollForm, ifsc: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">PAN Number</label>
                    <input className="input" value={payrollForm.pan} onChange={e => setPayrollForm({ ...payrollForm, pan: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aadhar Number</label>
                    <input className="input" value={payrollForm.aadhar} onChange={e => setPayrollForm({ ...payrollForm, aadhar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input className="input" value={payrollForm.mobile} onChange={e => setPayrollForm({ ...payrollForm, mobile: e.target.value })} />
                  </div>
                </div>

                <div className="section-title" style={{ marginTop: 20, marginBottom: 12, fontSize: '.85rem' }}>Earnings & Deductions</div>
                
                <div className="grid-2" style={{ gap: 24 }}>
                  {/* Earnings Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: '.78rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Earnings (INR)</div>
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">Basic Salary</label>
                        <input className="input" type="number" value={payrollForm.basicSalary} onChange={e => setPayrollForm({ ...payrollForm, basicSalary: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">HRA</label>
                        <input className="input" type="number" value={payrollForm.hra} onChange={e => setPayrollForm({ ...payrollForm, hra: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">Medical</label>
                        <input className="input" type="number" value={payrollForm.medical} onChange={e => setPayrollForm({ ...payrollForm, medical: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Conveyance</label>
                        <input className="input" type="number" value={payrollForm.conveyance} onChange={e => setPayrollForm({ ...payrollForm, conveyance: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Special</label>
                        <input className="input" type="number" value={payrollForm.specialAllowance} onChange={e => setPayrollForm({ ...payrollForm, specialAllowance: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: '.78rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Deductions (INR)</div>
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">TDS</label>
                        <input className="input" type="number" value={payrollForm.tds} onChange={e => setPayrollForm({ ...payrollForm, tds: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Professional Tax</label>
                        <input className="input" type="number" value={payrollForm.professionalTax} onChange={e => setPayrollForm({ ...payrollForm, professionalTax: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Other Deductions</label>
                        <input className="input" type="number" value={payrollForm.otherDeduction} onChange={e => setPayrollForm({ ...payrollForm, otherDeduction: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <button className="btn btn-primary" onClick={generatePayslip}>
                    <Coins size={14} style={{ marginRight: 6 }} /> Generate & Save Payslip
                  </button>
                </div>
              </div>
            </div>

            {/* Generated payslips history */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Generated Salary Slips</div>
                  <div className="card-subtitle">View and print past generated payslips</div>
                </div>
              </div>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Month</th>
                      <th>Gross Salary</th>
                      <th>Total Deductions</th>
                      <th style={{ fontWeight: 800 }}>Net Pay</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>
                          No salary slips generated yet.
                        </td>
                      </tr>
                    ) : (
                      payslips.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.userName}</td>
                          <td>{p.monthYear}</td>
                          <td>₹{p.grossSalary}</td>
                          <td>₹{p.totalDeductions}</td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>₹{p.netPay}</td>
                          <td>
                            <div className="row-actions" style={{ justifyContent: 'center' }}>
                              <button className="btn btn-ghost btn-icon" title="View Payslip" onClick={() => {
                                setSelectedPayslipPreview(p);
                                setPreviewModal(true);
                              }}>
                                <Eye size={14} />
                              </button>
                              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Delete" onClick={() => removePayslip(p.id, `${p.userName} — ${p.monthYear}`)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAYSLIP PREVIEW MODAL — exact format match */}
      <Modal
        open={previewModal}
        onClose={() => setPreviewModal(false)}
        title="Salary Slip Preview"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPreviewModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={13} style={{ marginRight: 6 }} /> Print / Save as PDF</button>
          </>
        }
      >
        {selectedPayslipPreview && (
          <div>
            {/* Upload controls — above the slip, hidden on print */}
            <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)', width: '100%', marginBottom: 2 }}>PAYSLIP BRANDING (optional — shown on printed slip only)</div>
              <button className="btn btn-sm btn-secondary" onClick={() => handleImageUpload(setSlipLogo)} style={{ fontSize: '.73rem' }}>
                {slipLogo ? '✓ Logo Uploaded' : '⬆ Upload Logo'}
              </button>
              {slipLogo && <button className="btn btn-sm btn-ghost" style={{ fontSize: '.73rem', color: 'var(--danger)' }} onClick={() => setSlipLogo(null)}>Remove Logo</button>}
              <button className="btn btn-sm btn-secondary" onClick={() => handleImageUpload(setSlipStamp)} style={{ fontSize: '.73rem' }}>
                {slipStamp ? '✓ Stamp Uploaded' : '⬆ Upload Stamp'}
              </button>
              {slipStamp && <button className="btn btn-sm btn-ghost" style={{ fontSize: '.73rem', color: 'var(--danger)' }} onClick={() => setSlipStamp(null)}>Remove</button>}
              <button className="btn btn-sm btn-secondary" onClick={() => handleImageUpload(setSlipSignature)} style={{ fontSize: '.73rem' }}>
                {slipSignature ? '✓ Signature Uploaded' : '⬆ Upload Signature'}
              </button>
              {slipSignature && <button className="btn btn-sm btn-ghost" style={{ fontSize: '.73rem', color: 'var(--danger)' }} onClick={() => setSlipSignature(null)}>Remove</button>}
            </div>

            {/* Slip body — exactly matching format */}
            <div id="payslip-body" style={{ background: 'white', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '10.5px', padding: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                <tbody>
                  {/* Company header */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '10px 14px', width: '30%', verticalAlign: 'middle', textAlign: 'center' }}>
                      {slipLogo
                        ? <img src={slipLogo} alt="Logo" style={{ maxHeight: 60, maxWidth: 130, objectFit: 'contain' }} />
                        : <div style={{ lineHeight: 1.2 }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e3b8a', letterSpacing: '-0.02em' }}>VIGOR</div>
                            <div style={{ fontSize: '7px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.15em', textTransform: 'uppercase' }}>LAUNCHPAD</div>
                          </div>
                      }
                    </td>
                    <td style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: 4 }}>Vigor LaunchPad</div>
                      <div style={{ fontSize: '8.5px', color: '#444', lineHeight: 1.5 }}>
                        Registered Office : Suit 3, 4th Floor, Samruddhi Venture Park, 4th Floor, MIDC<br />
                        Central Road, Andheri (E), Mumbai - 400093
                      </div>
                    </td>
                  </tr>
                  {/* Month title */}
                  <tr>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontWeight: 800, background: '#f5f5f5', fontSize: '11px' }}>
                      Pay Slip for the month {selectedPayslipPreview.monthYear}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Employee info — 4-column layout matching sample exactly */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '10.5px' }}>
                <tbody>
                  {[
                    ['Employee code', selectedPayslipPreview.empCode, 'Standard days', selectedPayslipPreview.standardDays],
                    ['Name', selectedPayslipPreview.userName, 'Days worked', selectedPayslipPreview.daysWorked],
                    ['Designation', selectedPayslipPreview.designation, 'Late mark', selectedPayslipPreview.lateMark],
                    ['Department', selectedPayslipPreview.department, 'Payment mode', selectedPayslipPreview.paymentMode],
                    ['Date of joining', selectedPayslipPreview.dateJoining, 'Bank Name', selectedPayslipPreview.bankName],
                    ['PAN', selectedPayslipPreview.pan, 'Bank Account number', selectedPayslipPreview.bankAccount],
                    ['Aadhar No:', selectedPayslipPreview.aadhar, 'IFSC Code', selectedPayslipPreview.ifsc],
                    ['Mobile Number', selectedPayslipPreview.mobile, '', ''],
                  ].map(([l1, v1, l2, v2], ri) => (
                    <tr key={ri}>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700, width: '22%', background: '#fafafa' }}>{l1}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', width: '28%' }}>{v1}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700, width: '22%', background: '#fafafa' }}>{l2}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', width: '28%' }}>{v2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Earnings & Deductions — matching 4-col sample layout */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '10.5px' }}>
                <tbody>
                  <tr style={{ background: '#f0f0f0', fontWeight: 800 }}>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', width: '25%' }}>Particulars</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', width: '25%' }}>Earnings</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', width: '25%' }}>Particulars</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', width: '25%' }}>Deductions</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700 }}>Gross Salary</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700 }}>{selectedPayslipPreview.grossSalary}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Basic Salary</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.basicSalary}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>TDS</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.tds || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>House Rent Allowance</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.hra}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Professional Tax</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.professionalTax || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Medical Allowance</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.medical}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Other Deduction</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.otherDeduction || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Conveyance</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.conveyance}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Special Allowance</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.specialAllowance}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Gross Salary</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.grossSalary}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Total Deductions</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedPayslipPreview.totalDeductions}</td>
                  </tr>
                  <tr style={{ fontWeight: 800, background: '#f5f5f5' }}>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>Net Pay</td>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '5px 6px', fontSize: '12px', fontWeight: 900 }}>{selectedPayslipPreview.netPay}</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatory area — with optional uploaded assets */}
              <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-start', gap: 60 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {slipSignature && <img src={slipSignature} alt="Signature" style={{ height: 40, objectFit: 'contain' }} />}
                  <div style={{ borderTop: '1px solid #000', width: 130, textAlign: 'center', paddingTop: 4, fontSize: '9.5px', fontWeight: 600 }}>Founder</div>
                </div>
                {slipStamp && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6 }}>
                    <img src={slipStamp} alt="Stamp" style={{ height: 60, objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>


        {selectedPayslipPreview && (
          <div className="payslip-print-container" style={{ padding: 10, background: 'white', color: '#000', fontFamily: 'sans-serif' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '11px' }}>
              <tbody>
            </tbody>
            </table>
          </div>
        )}




      {/* ADD/EDIT MODAL */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Edit User' : 'Add User'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save User</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Full Name <span className="req">*</span></label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Suresh Kumar"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Work Email <span className="req">*</span></label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="suresh@vigorlaunchpad.com"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Role <span className="req">*</span></label>
            <select
              className="select"
              value={form.role}
              onChange={e => {
                const newRole = e.target.value;
                setForm(f => ({
                  ...f,
                  role: newRole,
                  allowedNav: [...(ROLE_NAV[newRole] || [])]
                }));
              }}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input
              className="input"
              value={form.dept}
              onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
              placeholder="e.g., VigorSpace, HR"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Zone Assignment</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {Object.entries(ZONES).map(([key, val]) => {
                const isSelected = Array.isArray(form.zones) && form.zones.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const zones = Array.isArray(form.zones) ? form.zones : [];
                      const next = isSelected
                        ? zones.filter(z => z !== key)
                        : [...zones, key];
                      setForm(f => ({ ...f, zones: next }));
                    }}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '99px',
                      border: `2px solid ${isSelected ? val.color : 'var(--border)'}`,
                      background: isSelected ? val.color : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text-2)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '.78rem',
                      cursor: 'pointer',
                      transition: 'all .15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {isSelected && <span style={{ fontSize: '.7rem' }}>✓</span>}
                    {val.label}
                  </button>
                );
              })}
              {Array.isArray(form.zones) && form.zones.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, zones: [] }))}
                  style={{
                    padding: '5px 14px', borderRadius: '99px',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-3)', fontSize: '.75rem', cursor: 'pointer',
                  }}
                >Clear All</button>
              )}
            </div>
            <span style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 6, display: 'block' }}>
              Select one or more zones. Leave empty for National (all zones) access.
            </span>
          </div>
        </div>

        {/* Personal Details */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            👤 Personal Details (for Payroll)
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input className="input" placeholder="e.g., 98765 43210" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Joining</label>
              <input className="input" type="date" value={form.dateJoining} onChange={e => setForm(f => ({ ...f, dateJoining: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input className="input" placeholder="e.g., ABCDE1234F" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Aadhar Number</label>
              <input className="input" placeholder="e.g., 9999 8888 7777" value={form.aadhar} onChange={e => setForm(f => ({ ...f, aadhar: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            🏦 Bank Details (for Salary Slip)
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="input" placeholder="e.g., HDFC" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="input" placeholder="e.g., 50100866491516" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input className="input" placeholder="e.g., HDFC0000543" value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))} />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Password {editId && <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(leave blank to keep current)</span>} <span className="req">*</span></label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.exportAccess}
                onChange={e => setForm(f => ({ ...f, exportAccess: e.target.checked }))}
              />
              Allow Data Export / CSV Download
            </label>
          </div>
        </div>

        {/* ── GRANULAR PERMISSIONS MATRIX ── */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
            <Shield size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Page Access Rights
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'leads', label: 'Leads Pipeline' },
              { key: 'clients', label: 'Clients' },
              { key: 'campaigns', label: 'Campaigns' },
              { key: 'events', label: 'Events' },
              { key: 'vigorspace', label: 'Zone Overview' },
              { key: 'colleges', label: 'Colleges' },
              { key: 'vendors', label: 'Vendors' },
              { key: 'college_influencers', label: 'Ambassadors' },
              { key: 'influencers', label: 'Influencers' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'finance', label: 'Finance' },
              { key: 'reports', label: 'Reports' },
              { key: 'users', label: 'User Management' },
            ].map(p => {
              const checked = (form.allowedNav || []).includes(p.key);
              return (
                <label key={p.key} className="checkbox-label" style={{ fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...(form.allowedNav || []), p.key]
                        : (form.allowedNav || []).filter(k => k !== p.key);
                      setForm(f => ({ ...f, allowedNav: next }));
                    }}
                  />
                  {p.label}
                </label>
              );
            })}
          </div>

          {/* Entity CRUD Permissions Matrix */}
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Key size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Entity-Level Permissions
          </div>
          <div className="perm-matrix-wrap">
            <table className="perm-matrix">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Export CSV</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'leads', label: 'Leads' },
                  { key: 'clients', label: 'Clients' },
                  { key: 'campaigns', label: 'Campaigns' },
                  { key: 'events', label: 'Events' },
                  { key: 'colleges', label: 'Colleges' },
                  { key: 'vendors', label: 'Vendors' },
                  { key: 'influencers', label: 'Influencers' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'finance', label: 'Finance' },
                ].map(entity => {
                  const perms = form.permissions?.[entity.key] || { view: true, create: true, edit: true, delete: true, export: false };
                  const updatePerm = (action, val) => {
                    setForm(f => ({
                      ...f,
                      permissions: {
                        ...(f.permissions || {}),
                        [entity.key]: {
                          ...(f.permissions?.[entity.key] || { view: true, create: true, edit: true, delete: true, export: false }),
                          [action]: val
                        }
                      }
                    }));
                  };
                  return (
                    <tr key={entity.key}>
                      <td style={{ fontWeight: 600, fontSize: '.8rem' }}>{entity.label}</td>
                      {['view', 'create', 'edit', 'delete', 'export'].map(action => (
                        <td key={action} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={perms[action] || false}
                            onChange={e => updatePerm(action, e.target.checked)}
                            style={{ width: 15, height: 15, accentColor: action === 'delete' ? 'var(--danger)' : action === 'export' ? 'var(--warning)' : 'var(--primary)', cursor: 'pointer' }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-sm btn-ghost" style={{ fontSize: '.7rem' }}
              onClick={() => {
                const allPerms = {};
                ['leads','clients','campaigns','events','colleges','vendors','influencers','tasks','finance'].forEach(k => {
                  allPerms[k] = { view: true, create: true, edit: true, delete: true, export: true };
                });
                setForm(f => ({ ...f, permissions: allPerms, exportAccess: true }));
              }}>Grant All</button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ fontSize: '.7rem' }}
              onClick={() => {
                const viewOnly = {};
                ['leads','clients','campaigns','events','colleges','vendors','influencers','tasks','finance'].forEach(k => {
                  viewOnly[k] = { view: true, create: false, edit: false, delete: false, export: false };
                });
                setForm(f => ({ ...f, permissions: viewOnly, exportAccess: false }));
              }}>View Only</button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ fontSize: '.7rem', color: 'var(--danger)' }}
              onClick={() => {
                const none = {};
                ['leads','clients','campaigns','events','colleges','vendors','influencers','tasks','finance'].forEach(k => {
                  none[k] = { view: false, create: false, edit: false, delete: false, export: false };
                });
                setForm(f => ({ ...f, permissions: none, exportAccess: false }));
              }}>Revoke All</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
