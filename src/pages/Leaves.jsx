import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import {
  LeaveDB, AnnouncementDB, getAllUsers, genId, logActivity, formatDate
} from '../lib/data';
import {
  CalendarDays, Plus, Trash2, Check, X, AlertCircle, FileText, Megaphone, CheckSquare
} from 'lucide-react';

const LEAVE_TYPES = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  paid: 'Earned Leave (Paid)',
  unpaid: 'Unpaid Leave'
};

const LEAVE_COLORS = {
  casual: 'badge-blue',
  sick: 'badge-orange',
  paid: 'badge-green',
  unpaid: 'badge-gray'
};

const LEAVE_STATUS_COLORS = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red'
};

export default function Leaves() {
  const session = useSession();
  const toast = useToast();

  const [activeSubTab, setActiveSubTab] = useState('leaves'); // 'leaves' or 'notices'
  const [leaves, setLeaves] = useState([]);
  const [notices, setNotices] = useState([]);
  const [users, setUsers] = useState([]);

  // Leave Form State
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '', endDate: '', type: 'casual', reason: ''
  });

  // Notice Form State
  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '', content: ''
  });

  const isHR = ['admin', 'founder', 'hr', 'operations'].includes(session?.role);

  useEffect(() => {
    LeaveDB.syncFromDB().then(rows => setLeaves(rows));
    AnnouncementDB.syncFromDB().then(rows => setNotices(rows));
    setUsers(getAllUsers());
  }, []);

  const refreshLeaves = () => setLeaves(LeaveDB.all());
  const refreshNotices = () => setNotices(AnnouncementDB.all());

  // My leaves vs Team leaves
  const myLeaves = leaves.filter(l => l.userId === session?.id);
  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const pastLeaves = leaves.filter(l => l.status !== 'pending');

  async function requestLeave() {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast('Start date and End date are required', 'warning');
      return;
    }
    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      toast('Start date cannot be after end date', 'warning');
      return;
    }

    const payload = {
      id: genId('lv'),
      userId: session?.id,
      userName: session?.name || 'Unknown',
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      type: leaveForm.type,
      reason: leaveForm.reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await LeaveDB.add(payload);
    logActivity('Requested', 'Leave', `${LEAVE_TYPES[leaveForm.type]}`, `from ${formatDate(payload.startDate)}`);
    toast('Leave request submitted successfully!', 'success');
    setLeaveModal(false);
    refreshLeaves();
  }

  async function approveLeave(id, action) {
    const request = LeaveDB.get(id);
    if (!request) return;

    await LeaveDB.update(id, {
      status: action,
      approvedBy: session?.id,
      approvedByName: session?.name
    });

    logActivity(action === 'approved' ? 'Approved' : 'Rejected', 'Leave Request', `${request.userName}'s Leave`);
    toast(`Leave request ${action}`, 'info');
    refreshLeaves();
  }

  async function addNotice() {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      toast('Title and Content are required', 'warning');
      return;
    }

    const payload = {
      id: genId('ann'),
      title: noticeForm.title,
      content: noticeForm.content,
      addedBy: session?.id,
      addedByName: session?.name,
      createdAt: new Date().toISOString()
    };

    await AnnouncementDB.add(payload);
    logActivity('Posted', 'Announcement', noticeForm.title);
    toast('Announcement posted successfully!', 'success');
    setNoticeModal(false);
    setNoticeForm({ title: '', content: '' });
    refreshNotices();
  }

  async function deleteNotice(id, title) {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    await AnnouncementDB.remove(id);
    logActivity('Deleted', 'Announcement', title);
    toast('Announcement deleted', 'info');
    refreshNotices();
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>HR Leave & Notice Center</h1>
          <p className="text-sm text-muted">Submit leaves, view team planner, and post announcements.</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === 'leaves' ? (
            <button className="btn btn-primary" onClick={() => setLeaveModal(true)}>
              <Plus size={14} /> Request Leave
            </button>
          ) : (
            isHR && (
              <button className="btn btn-ai" onClick={() => setNoticeModal(true)}>
                <Megaphone size={14} style={{ marginRight: 6 }} /> New Notice
              </button>
            )
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={`tab-btn ${activeSubTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveSubTab('leaves')}>
          <CalendarDays size={13} style={{ marginRight: 6 }} /> Leave Planner
        </button>
        <button className={`tab-btn ${activeSubTab === 'notices' ? 'active' : ''}`} onClick={() => setActiveSubTab('notices')}>
          <Megaphone size={13} style={{ marginRight: 6 }} /> Notice Board
        </button>
      </div>

      {/* Leave Planner Tab */}
      {activeSubTab === 'leaves' && (
        <div className="grid-1-3">
          {/* My Leaves Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">My Leaves</div>
              <div className="card-subtitle">Your personal leave history</div>
            </div>
            <div className="card-body">
              {myLeaves.length === 0 ? (
                <div className="center text-muted" style={{ padding: 24, fontSize: '.82rem' }}>
                  <CalendarDays size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <div>No leaves requested yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myLeaves.map(l => (
                    <div key={l.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg)' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                        <span className={`badge ${LEAVE_COLORS[l.type]}`}>{LEAVE_TYPES[l.type]}</span>
                        <span className={`badge ${LEAVE_STATUS_COLORS[l.status]}`}>{l.status.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: '.82rem', fontWeight: 700 }}>
                        {formatDate(l.startDate)} to {formatDate(l.endDate)}
                      </div>
                      {l.reason && (
                        <div style={{ fontSize: '.74rem', color: 'var(--text-3)', marginTop: 4 }}>
                          "{l.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HR Leave Approvals & Planner */}
          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="card-header">
              <div className="card-title">Leave Approvals & Planner</div>
              <div className="card-subtitle">
                {isHR ? 'Manage team leave requests and approvals' : 'View recent team leave calendar status'}
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {isHR && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="section-title" style={{ fontSize: '.85rem', marginBottom: 12 }}>Pending Approvals ({pendingLeaves.length})</div>
                  {pendingLeaves.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: '.82rem', textAlign: 'center', padding: '16px 0' }}>
                      No pending requests. Everything is clear!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pendingLeaves.map(l => (
                        <div key={l.id} className="flex items-center justify-between" style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                          <div>
                            <div style={{ fontSize: '.82rem', fontWeight: 700 }}>{l.userName}</div>
                            <div style={{ fontSize: '.76rem', color: 'var(--text-2)', marginTop: 2 }}>
                              <span className={`badge ${LEAVE_COLORS[l.type]}`} style={{ marginRight: 6 }}>{LEAVE_TYPES[l.type]}</span>
                              {formatDate(l.startDate)} to {formatDate(l.endDate)}
                            </div>
                            {l.reason && <div style={{ fontSize: '.74rem', fontStyle: 'italic', color: 'var(--text-3)', marginTop: 4 }}>Reason: "{l.reason}"</div>}
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-icon" style={{ background: 'var(--success)', color: 'white' }} onClick={() => approveLeave(l.id, 'approved')}>
                              <Check size={12} />
                            </button>
                            <button className="btn btn-sm btn-icon" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => approveLeave(l.id, 'rejected')}>
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All History Planner table */}
              <div style={{ padding: '16px 20px' }}>
                <div className="section-title" style={{ fontSize: '.85rem', marginBottom: 12 }}>Leave History / Status Planner</div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Type</th>
                        <th>Dates</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Reviewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastLeaves.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>
                            No past leave requests.
                          </td>
                        </tr>
                      ) : (
                        pastLeaves.map(l => (
                          <tr key={l.id}>
                            <td style={{ fontWeight: 700 }}>{l.userName}</td>
                            <td><span className={`badge ${LEAVE_COLORS[l.type]}`}>{LEAVE_TYPES[l.type]}</span></td>
                            <td style={{ fontSize: '.8rem' }}>{formatDate(l.startDate)} to {formatDate(l.endDate)}</td>
                            <td style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{l.reason || '—'}</td>
                            <td><span className={`badge ${LEAVE_STATUS_COLORS[l.status]}`}>{l.status.toUpperCase()}</span></td>
                            <td style={{ fontSize: '.76rem', color: 'var(--text-3)' }}>{l.approvedByName || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice Board Tab */}
      {activeSubTab === 'notices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notices.length === 0 ? (
            <div className="card text-center" style={{ padding: 48 }}>
              <Megaphone size={40} color="var(--border-2)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <div className="empty-state-title">Notice board is empty</div>
              <div className="empty-state-text" style={{ maxWidth: 300, margin: '6px auto' }}>HR notices and corporate announcements will appear here.</div>
            </div>
          ) : (
            notices.map(n => (
              <div key={n.id} className="card" style={{ borderLeft: '4px solid var(--purple)', position: 'relative' }}>
                <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 6 }}>
                  <div>
                    <div className="card-title" style={{ fontSize: '.95rem', fontWeight: 800, color: 'var(--text)' }}>
                      <Megaphone size={13} style={{ verticalAlign: '-1px', marginRight: 6, color: 'var(--purple)' }} /> {n.title}
                    </div>
                    <div className="card-subtitle" style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 3 }}>
                      Posted by {n.addedByName} on {formatDate(n.createdAt)}
                    </div>
                  </div>
                  {isHR && (
                    <button className="btn btn-icon btn-ghost btn-sm" style={{ color: 'var(--danger)', opacity: 0.6 }} onClick={() => deleteNotice(n.id, n.title)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="card-body" style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingTop: 0 }}>
                  {n.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leave Request Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Submit Leave Request"
        footer={<><button className="btn btn-secondary" onClick={() => setLeaveModal(false)}>Cancel</button><button className="btn btn-primary" onClick={requestLeave}>Request Leave</button></>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date <span className="req">*</span></label>
            <input className="input" type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date <span className="req">*</span></label>
            <input className="input" type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select className="select" value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
              {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Reason / Notes</label>
          <textarea className="textarea" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="State reason for leave request" />
        </div>
      </Modal>

      {/* Notice Board Modal */}
      <Modal open={noticeModal} onClose={() => setNoticeModal(false)} title="Post Announcement"
        footer={<><button className="btn btn-secondary" onClick={() => setNoticeModal(false)}>Cancel</button><button className="btn btn-primary" onClick={addNotice}>Post Notice</button></>}>
        <div className="form-group">
          <label className="form-label">Notice Title <span className="req">*</span></label>
          <input className="input" placeholder="e.g., Mandatory Fest Guidelines — 2026" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Notice Content <span className="req">*</span></label>
          <textarea className="textarea" style={{ height: 160 }} placeholder="Write notice details company-wide announcement..." value={noticeForm.content} onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
