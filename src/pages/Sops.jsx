import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import { SopDB, logActivity } from '../lib/data';
import Modal from '../components/ui/Modal';
import { BookOpen, Plus, FileText, CheckCircle2, UserCheck, AlertCircle, Save, Trash2, Edit } from 'lucide-react';

const CATEGORIES = ['All', 'Operations', 'Campaigns', 'Sales', 'General'];

function parseInline(text) {
  if (!text) return '';
  const parts = text.split('**');
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{part}</strong> : part);
}

export default function Sops() {
  const session = useSession();
  const toast = useToast();

  const isOpsOrLead = ['operations', 'pm', 'admin', 'founder'].includes(session?.role);

  const [sops, setSops] = useState([]);
  const [selectedSop, setSelectedSop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'Operations', content: '' });

  const syncSops = async () => {
    try {
      const data = await SopDB.syncFromDB();
      setSops(data.length ? data : SopDB.all());
    } catch (err) {
      toast('Failed to sync SOPs.', 'error');
    }
  };

  useEffect(() => {
    syncSops().then(() => {
      const allSops = SopDB.all();
      if (allSops.length) setSelectedSop(allSops[0]);
    });
  }, []);

  const filtered = sops.filter(s => activeCategory === 'All' || s.category === activeCategory);

  function openAdd() {
    setEditId(null);
    setForm({ title: '', category: 'Operations', content: '' });
    setModal(true);
  }

  function openEdit(sop) {
    setEditId(sop.id);
    setForm({ title: sop.title, category: sop.category, content: sop.content });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) { toast('SOP Title is required.', 'warning'); return; }
    if (!form.content.trim()) { toast('SOP Content body is required.', 'warning'); return; }

    if (editId) {
      const target = sops.find(s => s.id === editId);
      const updatedItem = {
        ...target,
        title: form.title,
        category: form.category,
        content: form.content
      };
      await SopDB.update(editId, updatedItem);
      logActivity('Updated', 'SOP', form.title, form.category);
      toast('SOP Document updated.', 'success');
    } else {
      const newItem = {
        id: 'sop_' + Date.now(),
        title: form.title,
        category: form.category,
        content: form.content,
        createdBy: session?.name || 'Operations Manager',
        createdAt: new Date().toISOString(),
        acknowledgedBy: []
      };
      await SopDB.add(newItem);
      logActivity('Created', 'SOP', form.title, form.category);
      toast('New SOP Document added.', 'success');
    }
    setModal(false);
    syncSops().then(() => {
      // Keep selected document updated
      const allSops = SopDB.all();
      const updated = allSops.find(s => s.id === (editId || '')) || allSops[0];
      if (updated) setSelectedSop(updated);
    });
  }

  async function deleteSop(sop) {
    if (!confirm(`Are you sure you want to delete SOP: "${sop.title}"?`)) return;
    await SopDB.remove(sop.id);
    logActivity('Deleted', 'SOP', sop.title);
    toast('SOP deleted.', 'info');
    syncSops().then(() => {
      const allSops = SopDB.all();
      setSelectedSop(allSops.length ? allSops[0] : null);
    });
  }

  async function acknowledge(sop) {
    if (!sop) return;
    const name = session?.name || 'User';
    const ackList = sop.acknowledgedBy || [];
    if (ackList.includes(name)) {
      toast('You have already acknowledged reading this SOP.', 'info');
      return;
    }
    const updated = {
      ...sop,
      acknowledgedBy: [...ackList, name]
    };
    await SopDB.update(sop.id, updated);
    logActivity('Acknowledged SOP', 'SOP', sop.title);
    toast('Acknowledgement registered. Thank you!', 'success');
    syncSops().then(() => {
      setSelectedSop(updated);
    });
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">SOP Library</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM › Strategy › SOPs</div>
        </div>
        <div className="page-header-right" style={{ gap: 12 }}>
          {isOpsOrLead && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={14} /> Create SOP
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Category filtering chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                border: activeCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeCategory === cat ? 'var(--primary-hover)' : 'var(--surface)',
                color: activeCategory === cat ? 'var(--primary)' : 'var(--text-2)',
                padding: '6px 16px',
                borderRadius: 99,
                fontWeight: 600,
                fontSize: '.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* SOP layout structure */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'flex-start' }}>
          {/* Document list sidebar */}
          <div className="card" style={{ padding: 10 }}>
            <div style={{ padding: 8, fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Documents ({filtered.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 12, fontSize: '.78rem', color: 'var(--text-3)' }}>No documents found.</div>
              ) : (
                filtered.map(sop => (
                  <button
                    key={sop.id}
                    onClick={() => setSelectedSop(sop)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 'var(--r-sm)',
                      background: selectedSop?.id === sop.id ? 'var(--primary-hover)' : 'transparent',
                      border: 'none',
                      color: selectedSop?.id === sop.id ? 'var(--primary)' : 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.15s'
                    }}
                  >
                    <FileText size={16} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sop.title}
                      </div>
                      <span className="chip" style={{ fontSize: '.6rem', padding: '1px 6px', marginTop: 3, display: 'inline-block' }}>
                        {sop.category}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Document View pane */}
          <div className="card" style={{ minHeight: 450, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {selectedSop ? (
              <div>
                {/* Header detail */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{selectedSop.title}</h2>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '.72rem', color: 'var(--text-3)', marginTop: 6 }}>
                      <span>Category: <strong>{selectedSop.category}</strong></span>
                      <span>•</span>
                      <span>Author: <strong>{selectedSop.createdBy}</strong></span>
                    </div>
                  </div>
                  {isOpsOrLead && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '6px', borderRadius: 'var(--r-sm)' }}
                        onClick={() => openEdit(selectedSop)} 
                        title="Edit SOP"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '6px', borderRadius: 'var(--r-sm)', color: 'var(--danger)' }} 
                        onClick={() => deleteSop(selectedSop)} 
                        title="Delete SOP"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* SOP Body Content */}
                <div style={{ fontSize: '.86rem', lineHeight: 1.6, color: 'var(--text-2)' }}>
                  {(() => {
                    const lines = (selectedSop.content || '').split('\n');
                    return lines.map((line, idx) => {
                      const trimmed = line.trim();
                      
                      // Headings
                      if (trimmed.startsWith('### ')) {
                        return <h3 key={idx} style={{ fontSize: '.98rem', fontWeight: 800, margin: '14px 0 8px', color: 'var(--text)' }}>{parseInline(trimmed.slice(4))}</h3>;
                      }
                      if (trimmed.startsWith('## ')) {
                        return <h2 key={idx} style={{ fontSize: '1.1rem', fontWeight: 800, margin: '18px 0 10px', color: 'var(--text)' }}>{parseInline(trimmed.slice(3))}</h2>;
                      }
                      if (trimmed.startsWith('# ')) {
                        return <h1 key={idx} style={{ fontSize: '1.3rem', fontWeight: 900, margin: '22px 0 12px', color: 'var(--text)' }}>{parseInline(trimmed.slice(2))}</h1>;
                      }
                      
                      // Bullet lists
                      if (trimmed.startsWith('- ')) {
                        return (
                          <ul key={idx} style={{ margin: '4px 0', paddingLeft: 20 }}>
                            <li style={{ fontSize: '.84rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                              {parseInline(trimmed.slice(2))}
                            </li>
                          </ul>
                        );
                      }
                      
                      // Blank line
                      if (!trimmed) {
                        return <div key={idx} style={{ height: '8px' }} />;
                      }

                      // Normal paragraph
                      return (
                        <p key={idx} style={{ margin: '4px 0', fontSize: '.84rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
                          {parseInline(line)}
                        </p>
                      );
                    });
                  })()}
                </div>

                {/* Acknowledged section */}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 40, paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontWeight: 700, color: 'var(--text-2)' }}>
                      <UserCheck size={16} /> Acknowledged Readers
                    </div>
                    {/* Acknowledge button */}
                    {!(selectedSop.acknowledgedBy || []).includes(session?.name || '') && (
                      <button className="btn btn-sm btn-primary" onClick={() => acknowledge(selectedSop)}>
                        <CheckCircle2 size={12} style={{ marginRight: 6 }} /> I have read & understood this SOP
                      </button>
                    )}
                  </div>

                  {/* List of readers */}
                  {(selectedSop.acknowledgedBy || []).length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.74rem', color: 'var(--text-3)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
                      <AlertCircle size={14} /> No confirmation registered yet for this document.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(selectedSop.acknowledgedBy || []).map((name, i) => (
                        <span key={i} className="chip" style={{ fontSize: '.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                          ✓ {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, color: 'var(--text-3)' }}>
                <BookOpen size={48} />
                <div style={{ marginTop: 12, fontWeight: 700 }}>No SOP Selected</div>
                <div style={{ fontSize: '.8rem' }}>Choose an item from the sidebar or click "Create SOP".</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Edit SOP Document' : 'Create SOP Document'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              <Save size={13} style={{ marginRight: 6 }} />
              {editId ? 'Update SOP' : 'Save SOP'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">SOP Title <span className="req">*</span></label>
          <input
            className="input"
            placeholder="e.g., Campus Event Execution Protocol"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Document Content (Markdown / plain text) <span className="req">*</span></label>
          <textarea
            className="textarea"
            rows={12}
            placeholder="Describe the SOP guidelines..."
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '.85rem',
              fontFamily: 'monospace'
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
