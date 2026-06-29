import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import { OKRDB, genId, logActivity } from '../lib/data';
import Modal from '../components/ui/Modal';
import {
  Crosshair, Plus, ChevronDown, ChevronUp, Trash2,
  Edit2, Target, TrendingUp, CheckCircle2, AlertTriangle,
  Clock, Save, X, PlusCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  on_track:  { label: 'On Track',  color: '#10b981', bg: 'rgba(16,185,129,.12)', icon: CheckCircle2 },
  at_risk:   { label: 'At Risk',   color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: AlertTriangle },
  behind:    { label: 'Behind',    color: '#ef4444', bg: 'rgba(239,68,68,.12)',  icon: X },
  completed: { label: 'Completed', color: '#6366f1', bg: 'rgba(99,102,241,.12)', icon: CheckCircle2 },
};

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'];

function ProgressRing({ pct, size = 64, stroke = 6, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

function KRProgressBar({ kr, canEdit, onUpdate }) {
  const pct = Math.min(100, kr.target > 0 ? Math.round((kr.current / kr.target) * 100) : 0);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(kr.current);

  const statusColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
            {kr.text}
          </div>
          <div style={{ fontSize: '.73rem', color: 'var(--text-3)', marginTop: 3 }}>
            {kr.unit === '₹'
              ? `₹${(kr.current / 100000).toFixed(1)}L / ₹${(kr.target / 100000).toFixed(1)}L`
              : `${kr.current} / ${kr.target} ${kr.unit}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: '.75rem', fontWeight: 800, color: statusColor,
            background: `${statusColor}18`, padding: '2px 8px', borderRadius: 99
          }}>{pct}%</span>
          {canEdit && (
            editing ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  value={val}
                  onChange={e => setVal(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 70, padding: '3px 8px', borderRadius: 6,
                    border: '1px solid var(--primary)', fontSize: '.8rem',
                    background: 'var(--surface)', color: 'var(--text)'
                  }}
                />
                <button
                  onClick={() => { onUpdate(kr.id, val); setEditing(false); }}
                  style={{ background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.75rem' }}
                ><Save size={11} /></button>
                <button
                  onClick={() => { setVal(kr.current); setEditing(false); }}
                  style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                ><X size={11} /></button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.7rem', color: 'var(--text-2)' }}
              >Update</button>
            )
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${statusColor}cc, ${statusColor})`,
          transition: 'width .6s cubic-bezier(.4,0,.2,1)'
        }} />
      </div>
    </div>
  );
}

export default function OKRs() {
  const session = useSession();
  const toast = useToast();
  const isFounder = ['founder', 'admin'].includes(session?.role);

  const [okrs, setOkrs] = useState([]);
  const [quarter, setQuarter] = useState('Q2 2026');
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: '', quarter: 'Q2 2026', status: 'on_track',
    keyResults: [{ id: genId('kr'), text: '', target: 0, current: 0, unit: '' }]
  });

  const refresh = () => {
    OKRDB.syncFromDB().then(rows => setOkrs(rows));
  };

  useEffect(() => {
    OKRDB.syncFromDB().then(rows => {
      const local = OKRDB.all();
      setOkrs(rows.length ? rows : local);
      // Auto-expand first OKR
      if (rows.length) setExpanded({ [rows[0].id]: true });
      else if (local.length) setExpanded({ [local[0].id]: true });
    });
  }, []);

  const filtered = okrs.filter(o => o.quarter === quarter);

  // Company-wide average progress
  const avgProgress = filtered.length
    ? Math.round(filtered.reduce((s, o) => s + (o.progress || 0), 0) / filtered.length)
    : 0;

  function openAdd() {
    setEditId(null);
    setForm({
      title: '', quarter, status: 'on_track',
      keyResults: [{ id: genId('kr'), text: '', target: 0, current: 0, unit: '' }]
    });
    setModal(true);
  }

  function openEdit(okr) {
    setEditId(okr.id);
    setForm({
      title: okr.title,
      quarter: okr.quarter,
      status: okr.status,
      keyResults: okr.keyResults ? [...okr.keyResults] : []
    });
    setModal(true);
  }

  function addKR() {
    setForm(f => ({
      ...f,
      keyResults: [...f.keyResults, { id: genId('kr'), text: '', target: 0, current: 0, unit: '' }]
    }));
  }

  function removeKR(id) {
    setForm(f => ({ ...f, keyResults: f.keyResults.filter(k => k.id !== id) }));
  }

  function updateKR(id, field, value) {
    setForm(f => ({
      ...f,
      keyResults: f.keyResults.map(k => k.id === id ? { ...k, [field]: value } : k)
    }));
  }

  async function save() {
    if (!form.title.trim()) { toast('Objective title is required.', 'warning'); return; }
    if (!form.keyResults.length || form.keyResults.some(k => !k.text.trim())) {
      toast('All Key Results must have a description.', 'warning'); return;
    }

    const krs = form.keyResults.map(k => ({
      ...k,
      target: parseFloat(k.target) || 0,
      current: parseFloat(k.current) || 0,
    }));

    // Compute overall OKR progress as average of KR completion %
    const progress = krs.length
      ? Math.round(krs.reduce((s, k) => s + Math.min(100, k.target > 0 ? (k.current / k.target) * 100 : 0), 0) / krs.length)
      : 0;

    if (editId) {
      const updated = okrs.map(o => o.id === editId
        ? { ...o, title: form.title, quarter: form.quarter, status: form.status, keyResults: krs, progress }
        : o
      );
      OKRDB.save(updated);
      await OKRDB.syncFromDB().catch(() => {});
      // Upsert to Supabase
      toast('OKR updated!', 'success');
      setOkrs(OKRDB.all());
    } else {
      const newOKR = {
        id: genId('okr'),
        title: form.title,
        quarter: form.quarter,
        status: form.status,
        owner: session?.name || 'Founder',
        progress,
        keyResults: krs,
        createdAt: new Date().toISOString(),
      };
      await OKRDB.add(newOKR);
      logActivity('Created', 'OKR', form.title, form.quarter);
      toast('OKR created!', 'success');
      setOkrs(OKRDB.all());
      setExpanded(e => ({ ...e, [newOKR.id]: true }));
    }
    setModal(false);
    refresh();
  }

  async function del(okr) {
    if (!confirm(`Delete objective "${okr.title}"?`)) return;
    await OKRDB.remove(okr.id);
    logActivity('Deleted', 'OKR', okr.title, okr.quarter);
    toast('OKR deleted.', 'info');
    setOkrs(OKRDB.all());
  }

  // Update a single KR's progress (any team member)
  async function updateKRProgress(okrId, krId, newValue) {
    const updated = okrs.map(o => {
      if (o.id !== okrId) return o;
      const krs = o.keyResults.map(k => k.id === krId ? { ...k, current: newValue } : k);
      const progress = Math.round(
        krs.reduce((s, k) => s + Math.min(100, k.target > 0 ? (k.current / k.target) * 100 : 0), 0) / krs.length
      );
      return { ...o, keyResults: krs, progress };
    });
    OKRDB.save(updated);
    setOkrs(updated);
    logActivity('Updated', 'KR Progress', krId, `New value: ${newValue}`);
    toast('Progress updated!', 'success');
  }

  const statusColors = Object.fromEntries(
    Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.color])
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">OKR Tracker</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM › Strategy › OKRs</div>
        </div>
        <div className="page-header-right" style={{ gap: 10 }}>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={quarter}
            onChange={e => setQuarter(e.target.value)}
          >
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          {isFounder && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={14} /> New Objective
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Company Overview Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: 'var(--r)',
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
          <div style={{ position: 'absolute', right: 60, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

          {/* Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ProgressRing pct={avgProgress} size={100} stroke={8} color="#818cf8" />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', transform: 'rotate(90deg)'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{avgProgress}%</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {quarter} · Company OKR Progress
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: 4 }}>
              {filtered.length} Active Objective{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = filtered.filter(o => o.status === key).length;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                    <span style={{ fontSize: '.72rem', color: '#c7d2fe', fontWeight: 600 }}>
                      {count} {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {isFounder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ fontSize: '.72rem', color: '#a5b4fc', fontWeight: 600 }}>Total KRs</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                {filtered.reduce((s, o) => s + (o.keyResults?.length || 0), 0)}
              </div>
            </div>
          )}
        </div>

        {/* OKR List */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Crosshair size={36} color="var(--text-3)" />
            <div style={{ marginTop: 12, fontWeight: 700 }}>No OKRs for {quarter}</div>
            <div style={{ color: 'var(--text-3)', fontSize: '.83rem' }}>
              {isFounder ? 'Click "New Objective" to set company goals for this quarter.' : 'The founder hasn\'t set OKRs for this quarter yet.'}
            </div>
            {isFounder && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                <Plus size={14} /> Create First OKR
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((okr, idx) => {
              const isOpen = !!expanded[okr.id];
              const cfg = STATUS_CONFIG[okr.status] || STATUS_CONFIG.on_track;
              const StatusIcon = cfg.icon;
              const pct = okr.progress || 0;

              return (
                <div key={okr.id} className="card" style={{ overflow: 'hidden', border: `1.5px solid ${cfg.color}30` }}>
                  {/* OKR Header */}
                  <div
                    style={{
                      padding: '18px 22px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer',
                      background: isOpen ? `${cfg.color}06` : 'transparent',
                      transition: 'background .2s',
                    }}
                    onClick={() => setExpanded(e => ({ ...e, [okr.id]: !e[okr.id] }))}
                  >
                    {/* Ring */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <ProgressRing pct={pct} size={52} stroke={5} color={cfg.color} />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', transform: 'rotate(90deg)',
                        fontSize: '.65rem', fontWeight: 900, color: cfg.color
                      }}>
                        {pct}%
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                          O{idx + 1} · {okr.quarter}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: '.68rem', fontWeight: 700, color: cfg.color,
                          background: cfg.bg, padding: '2px 8px', borderRadius: 99
                        }}>
                          <StatusIcon size={10} /> {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
                        {okr.title}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                        {okr.keyResults?.length || 0} Key Results · Set by {okr.owner}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isFounder && (
                        <>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={e => { e.stopPropagation(); openEdit(okr); }}
                            title="Edit OKR"
                          ><Edit2 size={13} /></button>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ color: 'var(--danger)' }}
                            onClick={e => { e.stopPropagation(); del(okr); }}
                            title="Delete OKR"
                          ><Trash2 size={13} /></button>
                        </>
                      )}
                      {isOpen ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                    </div>
                  </div>

                  {/* KR List */}
                  {isOpen && (
                    <div style={{ padding: '0 22px 20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '16px 0 10px' }}>
                        Key Results
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(okr.keyResults || []).map(kr => (
                          <KRProgressBar
                            key={kr.id}
                            kr={kr}
                            canEdit={true}
                            onUpdate={(krId, val) => updateKRProgress(okr.id, krId, val)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Edit Objective' : 'New Company Objective'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              <Save size={13} style={{ marginRight: 6 }} />
              {editId ? 'Update OKR' : 'Create OKR'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Objective Title <span className="req">*</span></label>
          <input
            className="input"
            placeholder="e.g., Become the #1 campus activation partner in India"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Quarter</label>
            <select className="select" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Results */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>Key Results <span className="req">*</span></span>
            <button
              type="button"
              onClick={addKR}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700
              }}
            ><PlusCircle size={12} /> Add KR</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.keyResults.map((kr, i) => (
              <div key={kr.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-3)' }}>KR {i + 1}</span>
                  {form.keyResults.length > 1 && (
                    <button type="button" onClick={() => removeKR(kr.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input
                    className="input"
                    placeholder="Key Result description"
                    value={kr.text}
                    onChange={e => updateKR(kr.id, 'text', e.target.value)}
                  />
                </div>
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Target</label>
                    <input className="input" type="number" value={kr.target} onChange={e => updateKR(kr.id, 'target', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current</label>
                    <input className="input" type="number" value={kr.current} onChange={e => updateKR(kr.id, 'current', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input className="input" placeholder="e.g., colleges, ₹, %" value={kr.unit} onChange={e => updateKR(kr.id, 'unit', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
