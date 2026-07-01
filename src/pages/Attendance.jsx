import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import {
  AttendanceDB, getAllUsers, genId, logActivity, formatDate, formatDateTime
} from '../lib/data';
import {
  Clock, Check, X, AlertCircle, Calendar, MapPin, User, Download,
  Search, FileSpreadsheet, Edit2, Save, Sparkles, Filter
} from 'lucide-react';

const STATUS_LABELS = {
  present: 'Present',
  late: 'Late Arrival',
  half_day: 'Half Day',
  absent: 'Absent',
  leave: 'On Leave'
};

const STATUS_COLORS = {
  present: 'badge-green',
  late: 'badge-yellow',
  half_day: 'badge-orange',
  absent: 'badge-red',
  leave: 'badge-blue'
};

export default function Attendance() {
  const session = useSession();
  const toast = useToast();

  const isHR = ['admin', 'founder', 'hr', 'operations'].includes(session?.role);

  // Tab state: 'my_attendance' or 'hr_dashboard'
  const [activeTab, setActiveTab] = useState(isHR ? 'hr_dashboard' : 'my_attendance');

  // Core DB States
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);

  // Time & Filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterZone, setFilterZone] = useState('');

  // Daily Clock-in States
  const [todayRecord, setTodayRecord] = useState(null);
  const [clockInLocation, setClockInLocation] = useState('office');
  const [clockInNote, setClockInNote] = useState('');

  // HR Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { userId, userName, date, record }
  const [editForm, setEditForm] = useState({
    status: 'present',
    checkIn: '09:00:00',
    checkOut: '18:30:00',
    location: 'office',
    note: ''
  });

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const yearsList = [2025, 2026, 2027];

  useEffect(() => {
    AttendanceDB.syncFromDB().then(rows => setAttendance(rows));
    setUsers(getAllUsers());
  }, []);

  const refreshData = () => {
    setAttendance(AttendanceDB.all());
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Find or set today's record for logged-in user
  useEffect(() => {
    const todayStr = getTodayStr();
    const todayRec = attendance.find(r => r.userId === session?.id && r.date === todayStr);
    setTodayRecord(todayRec || null);
    if (todayRec) {
      setClockInLocation(todayRec.location || 'office');
      setClockInNote(todayRec.note || '');
    }
  }, [attendance, session]);

  // Handle Manual Clock Out
  async function handleClockOut() {
    if (!todayRecord) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    await AttendanceDB.update(todayRecord.id, {
      checkOut: timeStr,
      note: clockInNote || todayRecord.note
    });

    logActivity('Clocked Out', 'Attendance', session.name, `at ${timeStr}`);
    toast('Clocked out successfully for today!', 'success');
    refreshData();
  }

  // Handle manual/web check-in location or note update
  async function handleUpdateCheckIn() {
    if (!todayRecord) return;
    await AttendanceDB.update(todayRecord.id, {
      location: clockInLocation,
      note: clockInNote
    });
    toast('Attendance note & location updated!', 'success');
    refreshData();
  }

  // HR Save / Override attendance record
  async function handleSaveOverride() {
    const { userId, userName, date, record } = editingCell;
    const dateStr = date;

    if (record) {
      // Update existing record
      await AttendanceDB.update(record.id, {
        status: editForm.status,
        checkIn: editForm.checkIn || null,
        checkOut: editForm.checkOut || null,
        location: editForm.location,
        note: editForm.note
      });
      logActivity('Overrode Attendance', 'HR Dashboard', `${userName} on ${dateStr}`, `Status: ${editForm.status}`);
      toast('Attendance entry updated!', 'success');
    } else {
      // Create new record
      const payload = {
        id: genId('att'),
        userId,
        userName,
        date: dateStr,
        checkIn: editForm.checkIn || null,
        checkOut: editForm.checkOut || null,
        status: editForm.status,
        type: 'manual',
        location: editForm.location,
        note: editForm.note || 'Manually added by HR'
      };
      await AttendanceDB.add(payload);
      logActivity('Created Attendance Entry', 'HR Dashboard', `${userName} on ${dateStr}`, `Status: ${editForm.status}`);
      toast('Attendance entry created!', 'success');
    }
    setEditModal(false);
    refreshData();
  }

  // Open HR edit modal for a specific user and date
  function openEditModal(userId, userName, dateStr, existingRecord) {
    setEditingCell({ userId, userName, date: dateStr, record: existingRecord });
    if (existingRecord) {
      setEditForm({
        status: existingRecord.status || 'present',
        checkIn: existingRecord.checkIn || '09:00:00',
        checkOut: existingRecord.checkOut || '18:30:00',
        location: existingRecord.location || 'office',
        note: existingRecord.note || ''
      });
    } else {
      setEditForm({
        status: 'present',
        checkIn: '09:00:00',
        checkOut: '18:30:00',
        location: 'office',
        note: ''
      });
    }
    setEditModal(true);
  }

  // Calculate stats for current logged-in user in selected month
  const myMonthlyRecords = attendance.filter(r => {
    if (r.userId !== session?.id) return false;
    const d = new Date(r.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const totalDaysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  // Generate array of date strings for current month (YYYY-MM-DD)
  const monthDates = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    const m = (selectedMonth + 1).toString().padStart(2, '0');
    return `${selectedYear}-${m}-${day}`;
  });

  // Calculate summary stats
  const presentDays = myMonthlyRecords.filter(r => r.status === 'present').length;
  const lateDays = myMonthlyRecords.filter(r => r.status === 'late').length;
  const leaveDays = myMonthlyRecords.filter(r => r.status === 'leave').length;
  const halfDays = myMonthlyRecords.filter(r => r.status === 'half_day').length;
  const absentDays = myMonthlyRecords.filter(r => r.status === 'absent').length;

  const totalWorkingDaysRecorded = myMonthlyRecords.length;
  const attendanceRate = totalWorkingDaysRecorded > 0
    ? Math.round(((presentDays + lateDays + halfDays * 0.5) / totalWorkingDaysRecorded) * 100)
    : 0;

  // Filtered users for HR dashboard grid
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !filterDept || u.dept === filterDept;
    // Check if zone filters apply
    const uZones = Array.isArray(u.zones) ? u.zones : (u.zone ? [u.zone] : []);
    const matchesZone = !filterZone || uZones.includes(filterZone);
    return matchesSearch && matchesDept && matchesZone;
  });

  // Export Monthly HR Attendance sheet to CSV
  function handleExportCSV() {
    const rows = filteredUsers.map(u => {
      const userRecs = attendance.filter(r => {
        const d = new Date(r.date);
        return r.userId === u.id && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      const pCount = userRecs.filter(r => r.status === 'present').length;
      const lCount = userRecs.filter(r => r.status === 'late').length;
      const hdCount = userRecs.filter(r => r.status === 'half_day').length;
      const abCount = userRecs.filter(r => r.status === 'absent').length;
      const lvCount = userRecs.filter(r => r.status === 'leave').length;

      return {
        'Employee Name': u.name,
        'Department': u.dept || '—',
        'Zone(s)': (u.zones || [u.zone || 'National']).join(', '),
        'Present (P)': pCount,
        'Late (L)': lCount,
        'Half Day (HD)': hdCount,
        'Absent (A)': abCount,
        'On Leave (LV)': lvCount,
        'Attendance Rate %': userRecs.length > 0 ? Math.round(((pCount + lCount + hdCount * 0.5) / userRecs.length) * 100) : 0
      };
    });

    const csvHeaders = Object.keys(rows[0] || {}).join(',');
    const csvContent = [
      csvHeaders,
      ...rows.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const filename = `VL_Attendance_${monthsList[selectedMonth]}_${selectedYear}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
    logActivity('Exported', 'Attendance Reports', `${monthsList[selectedMonth]} CSV sheet`);
    toast('Attendance sheet exported successfully!', 'success');
  }

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance & Clock-In</h1>
          <p className="text-sm text-muted">Daily log-in counts, manual clock-outs, and HR metrics.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'hr_dashboard' && isHR && (
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              <Download size={13} style={{ marginRight: 6 }} /> Export Sheet
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        {isHR && (
          <button
            className={`tab-btn ${activeTab === 'hr_dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('hr_dashboard')}
          >
            <Clock size={13} style={{ marginRight: 6 }} /> HR Dashboard
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'my_attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_attendance')}
        >
          <User size={13} style={{ marginRight: 6 }} /> My Attendance Log
        </button>
      </div>

      {/* ── TAB 1: HR DASHBOARD ────────────────────────────────────────── */}
      {activeTab === 'hr_dashboard' && isHR && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters Bar */}
          <div className="card" style={{ padding: 16 }}>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {monthsList.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                >
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {['Management', 'Sales', 'VigorSpace Team', 'Influencer Team', 'Operations', 'Finance', 'HR Team'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={filterZone}
                  onChange={e => setFilterZone(e.target.value)}
                >
                  <option value="">All Zones</option>
                  {['north', 'south', 'east', 'west', 'central'].map(z => (
                    <option key={z} value={z}>{z.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="search-wrap" style={{ flex: '0 1 240px', margin: 0 }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ padding: '6px 10px 6px 28px', fontSize: '.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="card" style={{ overflowX: 'auto', padding: '16px 20px' }}>
            <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="var(--primary)" />
              <span>Team Attendance Matrix ({monthsList[selectedMonth]} {selectedYear})</span>
            </div>
            
            <div style={{ minWidth: 800 }}>
              <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 150, zIndex: 10, background: '#fff', position: 'sticky', left: 0 }}>Employee</th>
                    {monthDates.map((dStr, idx) => {
                      const dayNum = idx + 1;
                      const dateObj = new Date(dStr);
                      const isWE = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      return (
                        <th
                          key={dStr}
                          style={{
                            textAlign: 'center',
                            padding: '6px 2px',
                            fontSize: '.72rem',
                            fontWeight: 700,
                            minWidth: 26,
                            background: isWE ? 'var(--bg-alt)' : '#fff',
                            color: isWE ? 'var(--text-3)' : 'var(--text)',
                          }}
                        >
                          {dayNum}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={totalDaysInMonth + 1} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>
                        No employee profiles found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 700, minWidth: 150, zIndex: 10, background: '#fff', position: 'sticky', left: 0, borderRight: '1px solid var(--border)' }}>
                            <div className="cell-primary" style={{ fontSize: '.82rem' }}>{u.name}</div>
                            <div className="cell-sub" style={{ fontSize: '.7rem' }}>{u.dept || 'Operations'}</div>
                          </td>
                          {monthDates.map(dStr => {
                            const dateObj = new Date(dStr);
                            const isWE = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                            const record = attendance.find(r => r.userId === u.id && r.date === dStr);

                            let cellText = '—';
                            let cellBg = 'transparent';
                            let cellTitle = 'No Record';

                            if (record) {
                              if (record.status === 'present') { cellText = 'P'; cellBg = '#d1fae5'; cellTitle = 'Present'; }
                              else if (record.status === 'late') { cellText = 'L'; cellBg = '#fef3c7'; cellTitle = 'Late Arrival'; }
                              else if (record.status === 'half_day') { cellText = 'HD'; cellBg = '#ffedd5'; cellTitle = 'Half Day'; }
                              else if (record.status === 'absent') { cellText = 'A'; cellBg = '#fee2e2'; cellTitle = 'Absent'; }
                              else if (record.status === 'leave') { cellText = 'LV'; cellBg = '#dbeafe'; cellTitle = 'On Leave'; }
                              cellTitle += `\nCheck-in: ${record.checkIn || '—'}\nCheck-out: ${record.checkOut || '—'}\nNote: ${record.note || '—'}`;
                            } else if (isWE) {
                              cellText = '';
                              cellBg = '#f3f4f6';
                              cellTitle = 'Weekend';
                            } else if (new Date(dStr) < new Date()) {
                              // Past days with no record default to visual absent indication
                              cellText = 'A';
                              cellBg = '#fee2e2';
                              cellTitle = 'Absent (No Login Recorded)';
                            }

                            return (
                              <td
                                key={dStr}
                                onClick={() => openEditModal(u.id, u.name, dStr, record)}
                                title={cellTitle}
                                style={{
                                  textAlign: 'center',
                                  padding: '6px 0',
                                  cursor: 'pointer',
                                  background: cellBg,
                                  border: '1px solid var(--border)',
                                  fontSize: '.74rem',
                                  fontWeight: 800,
                                  color: record?.status === 'present' ? '#065f46' : record?.status === 'late' ? '#92400e' : record?.status === 'leave' ? '#1e40af' : '#b91c1c',
                                  transition: 'filter .1s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)'; }}
                                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                              >
                                {cellText}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Grid Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: '.76rem', color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#d1fae5', border: '1px solid #a7f3d0' }}/><span>P = Present</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#fef3c7', border: '1px solid #fde68a' }}/><span>L = Late Arrival</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#ffedd5', border: '1px solid #fed7aa' }}/><span>HD = Half Day</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#fee2e2', border: '1px solid #fca5a5' }}/><span>A = Absent</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#dbeafe', border: '1px solid #bfdbfe' }}/><span>LV = Leave</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 14, background: '#f3f4f6' }}/><span>Weekend</span></div>
              <div style={{ marginLeft: 'auto', fontStyle: 'italic', color: 'var(--text-3)' }}>Tip: Click any cell to manually add or override attendance.</div>
            </div>
          </div>

          {/* HR Monthly Metrics Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Employee Monthly Totals</div>
              <div className="card-subtitle">Aggregated totals for payroll & HR reference</div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Present Days</th>
                    <th>Late Days</th>
                    <th>Half Days</th>
                    <th>Leaves Taken</th>
                    <th>Absent Days</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const userRecs = attendance.filter(r => {
                      const d = new Date(r.date);
                      return r.userId === u.id && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                    });

                    const pCount = userRecs.filter(r => r.status === 'present').length;
                    const lCount = userRecs.filter(r => r.status === 'late').length;
                    const hdCount = userRecs.filter(r => r.status === 'half_day').length;
                    const abCount = userRecs.filter(r => r.status === 'absent').length;
                    const lvCount = userRecs.filter(r => r.status === 'leave').length;
                    const rate = userRecs.length > 0 ? Math.round(((pCount + lCount + hdCount * 0.5) / userRecs.length) * 100) : 0;

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{u.name}</div>
                          <div className="cell-sub">{u.email}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{pCount} days</td>
                        <td style={{ color: lCount > 2 ? 'var(--warning)' : 'inherit' }}>{lCount} times</td>
                        <td>{hdCount} days</td>
                        <td>{lvCount} days</td>
                        <td style={{ color: abCount > 1 ? 'var(--danger)' : 'inherit' }}>{abCount} days</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800 }}>{rate}%</span>
                            <div style={{ width: 60, height: 6, background: 'var(--bg-alt)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: rate > 80 ? 'var(--success)' : rate > 50 ? 'var(--warning)' : 'var(--danger)' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MY PERSONAL LOG ─────────────────────────────────────── */}
      {activeTab === 'my_attendance' && (
        <div className="grid-1-3">
          {/* Left panel: Daily check-in status card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Clock status */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={18} color="var(--primary)" />
                <div style={{ fontSize: '.84rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>
                  Today's Status
                </div>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: 16, border: '1px solid var(--border)', textAlign: 'center', marginBottom: 20 }}>
                {todayRecord ? (
                  <>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                      CHECKED IN AT
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', margin: '4px 0 8px' }}>
                      {todayRecord.checkIn ? todayRecord.checkIn.slice(0, 5) : '—'}
                    </div>
                    <span className={`badge ${STATUS_COLORS[todayRecord.status] || 'badge-gray'}`} style={{ fontSize: '.8rem', padding: '4px 10px' }}>
                      {STATUS_LABELS[todayRecord.status]}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={28} color="var(--text-3)" style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                    <div style={{ fontSize: '.8rem', color: 'var(--text-2)', fontWeight: 700 }}>
                      No Login Recorded Today
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                      Your attendance logs automatically when you sign in.
                    </div>
                  </>
                )}
              </div>

              {todayRecord && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Work Location</label>
                    <select
                      className="select"
                      value={clockInLocation}
                      onChange={e => setClockInLocation(e.target.value)}
                    >
                      <option value="office">🏢 Head Office</option>
                      <option value="remote">🏡 Remote Work</option>
                      <option value="field">🎒 Field Activation</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Check-In Notes</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 60, padding: 8, fontSize: '.8rem', resize: 'none' }}
                      placeholder="e.g. executing North Zone activation, client meeting, etc."
                      value={clockInNote}
                      onChange={e => setClockInNote(e.target.value)}
                    />
                  </div>

                  <button className="btn btn-secondary w-full" onClick={handleUpdateCheckIn}>
                    Update Details
                  </button>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                  {todayRecord.checkOut ? (
                    <div style={{ background: '#f9fafb', borderRadius: 'var(--r-sm)', padding: 12, border: '1px dashed var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: '.74rem', color: 'var(--text-3)' }}>CLOCK OUT RECORDED</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-2)', marginTop: 2 }}>
                        {todayRecord.checkOut.slice(0, 5)}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn w-full"
                      style={{ background: 'var(--danger)', color: 'white' }}
                      onClick={handleClockOut}
                    >
                      Clock Out for Today
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Summary Totals */}
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Month Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex justify-between items-center" style={{ fontSize: '.8rem' }}>
                  <span className="text-muted">Present (P)</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{presentDays} days</span>
                </div>
                <div className="flex justify-between items-center" style={{ fontSize: '.8rem' }}>
                  <span className="text-muted">Late Arrivals (L)</span>
                  <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{lateDays} times</span>
                </div>
                <div className="flex justify-between items-center" style={{ fontSize: '.8rem' }}>
                  <span className="text-muted">Leaves Taken (LV)</span>
                  <span style={{ fontWeight: 700, color: 'var(--info)' }}>{leaveDays} days</span>
                </div>
                <div className="flex justify-between items-center" style={{ fontSize: '.8rem' }}>
                  <span className="text-muted">Attendance Rate</span>
                  <span style={{ fontWeight: 800 }}>{attendanceRate}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-alt)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${attendanceRate}%`, height: '100%', background: 'var(--primary)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Calendar of dates for this user */}
          <div className="card" style={{ gridColumn: 'span 3', padding: 20 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
              <div>
                <div className="card-title">My Monthly Log</div>
                <div className="card-subtitle">Calendar overview of your records in {monthsList[selectedMonth]} {selectedYear}</div>
              </div>
              <div className="flex gap-2">
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {monthsList.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                  className="select select-sm"
                  style={{ width: 'auto' }}
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                >
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Duration</th>
                    <th>Daily Notes / Log</th>
                  </tr>
                </thead>
                <tbody>
                  {myMonthlyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-3)' }}>
                        No check-in logs found for this month.
                      </td>
                    </tr>
                  ) : (
                    myMonthlyRecords.map(r => {
                      // Compute duration if checkIn & checkOut exist
                      let dur = '—';
                      if (r.checkIn && r.checkOut) {
                        const [hi, mi] = r.checkIn.split(':').map(Number);
                        const [ho, mo] = r.checkOut.split(':').map(Number);
                        const mins = (ho * 60 + mo) - (hi * 60 + mi);
                        dur = mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '—';
                      }

                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700 }}>{formatDate(r.date)}</td>
                          <td>
                            <span className={`badge ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '.8rem' }}>
                            {r.location === 'office' ? '🏢 Office' : r.location === 'remote' ? '🏡 Remote' : r.location === 'field' ? '🎒 Field' : '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.checkIn || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.checkOut || '—'}</td>
                          <td style={{ fontSize: '.8rem' }}>{dur}</td>
                          <td style={{ fontSize: '.78rem', color: 'var(--text-2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.note}>
                            {r.note || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* HR Edit / Override Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={`Adjust Attendance — ${editingCell?.userName}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveOverride}><Save size={14} style={{ marginRight: 6 }} /> Save Entry</button>
          </>
        }
      >
        <div style={{ fontSize: '.8rem', color: 'var(--text-2)', padding: '0 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          You are editing the attendance record for <strong>{editingCell?.userName}</strong> on <strong>{editingCell ? formatDate(editingCell.date) : ''}</strong>.
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Attendance Status</label>
            <select
              className="select"
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="present">Present (Full Day)</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="leave">Approved Leave</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Work Location</label>
            <select
              className="select"
              value={editForm.location}
              onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
            >
              <option value="office">🏢 Office</option>
              <option value="remote">🏡 Remote</option>
              <option value="field">🎒 Field</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Check-In Time</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 09:15:00"
              value={editForm.checkIn}
              onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))}
              disabled={['absent', 'leave'].includes(editForm.status)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Check-Out Time</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 18:30:00"
              value={editForm.checkOut}
              onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))}
              disabled={['absent', 'leave'].includes(editForm.status)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Admin Reason / Notes</label>
          <textarea
            className="input"
            style={{ minHeight: 60, padding: 8, fontSize: '.8rem' }}
            placeholder="Reason for adjustment (e.g. client meeting, corrected punch-in error)"
            value={editForm.note}
            onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
