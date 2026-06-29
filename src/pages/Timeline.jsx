import { useState, useEffect } from 'react';
import { useSession, useToast } from '../contexts/AppContext';
import { CampaignDB, EventDB, CAMPAIGN_STATUS_COLORS, EVENT_STATUS_COLORS, formatDate } from '../lib/data';
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, Eye, RefreshCw, BarChart2 } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Timeline() {
  const session = useSession();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 15)); // Default to May 2026 for demo consistency
  const [campaigns, setCampaigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const syncData = async () => {
    setLoading(true);
    try {
      const cList = await CampaignDB.syncFromDB();
      const eList = await EventDB.syncFromDB();
      setCampaigns(cList);
      setEvents(eList);
    } catch (err) {
      toast('Failed to sync timeline data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Process item placement in Gantt Grid
  const getGanttSpan = (itemStart, itemEnd) => {
    if (!itemStart) return null;
    const start = new Date(itemStart);
    const end = itemEnd ? new Date(itemEnd) : new Date(start.getTime() + 86400000 * 3); // default 3 days span

    // Calculate boundary start and end within current month
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    if (end < monthStart || start > monthEnd) return null;

    const spanStart = Math.max(1, start.getMonth() === month && start.getFullYear() === year ? start.getDate() : 1);
    const spanEnd = Math.min(daysInMonth, end.getMonth() === month && end.getFullYear() === year ? end.getDate() : daysInMonth);

    return {
      startCol: spanStart,
      spanWidth: (spanEnd - spanStart) + 1,
      startOffset: ((spanStart - 1) / daysInMonth) * 100,
      widthPercent: (((spanEnd - spanStart) + 1) / daysInMonth) * 100
    };
  };

  // Find overlapping dates for conflict checks
  const checkConflicts = (item, isEvent = false) => {
    const start = new Date(item.startDate || item.date);
    const end = new Date(item.endDate || item.date || start.getTime() + 86400000 * 3);

    const overlaps = [];

    // check campaigns
    campaigns.forEach(c => {
      if (c.id === item.id) return;
      const cStart = new Date(c.startDate);
      const cEnd = new Date(c.endDate || c.startDate);
      if (start <= cEnd && end >= cStart) {
        overlaps.push({ name: c.name, type: 'Campaign' });
      }
    });

    // check events
    events.forEach(e => {
      if (e.id === item.id) return;
      const eStart = new Date(e.startDate || e.date);
      const eEnd = new Date(e.endDate || e.date || eStart.getTime() + 86400000 * 3);
      if (start <= eEnd && end >= eStart) {
        overlaps.push({ name: e.title || e.name, type: 'Event' });
      }
    });

    return overlaps;
  };

  const getStatusColor = (status, isEvent) => {
    const colors = isEvent ? EVENT_STATUS_COLORS : CAMPAIGN_STATUS_COLORS;
    const badge = colors[status] || 'badge-gray';
    if (badge.includes('green')) return '#10b981';
    if (badge.includes('blue')) return '#3b82f6';
    if (badge.includes('purple')) return '#8b5cf6';
    if (badge.includes('orange')) return '#f97316';
    if (badge.includes('yellow')) return '#eab308';
    if (badge.includes('red')) return '#ef4444';
    return '#9ca3af';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Campaign & Event Timeline</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM › Strategy › Timeline</div>
        </div>
        <div className="page-header-right" style={{ gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={syncData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px 6px' }}>
            <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '.85rem', fontWeight: 700, minWidth: 100, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Timeline Analysis Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 'var(--r-sm)', padding: 10 }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{campaigns.length}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Active Campaigns</div>
            </div>
          </div>
          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 'var(--r-sm)', padding: 10 }}>
              <BarChart2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{events.length}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Campus Events Scheduled</div>
            </div>
          </div>
          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--r-sm)', padding: 10 }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {campaigns.filter(c => checkConflicts(c).length > 0).length + events.filter(e => checkConflicts(e, true).length > 0).length}
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Overlapping Timelines</div>
            </div>
          </div>
        </div>

        {/* Gantt Chart Grid */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              {/* Timeline Header Row (Days of the Month) */}
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '.78rem', display: 'flex', alignItems: 'center' }}>
                  Campaign / Event Name
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, borderLeft: '1px solid var(--border)' }}>
                  {dayColumns.map(d => {
                    const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
                    return (
                      <div
                        key={d}
                        style={{
                          textAlign: 'center', padding: '10px 0', fontSize: '.68rem', fontWeight: isToday ? 800 : 500,
                          color: isToday ? 'var(--primary)' : 'var(--text-2)',
                          background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          borderRight: '1px solid var(--border-light)'
                        }}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt Timeline Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Section header: Campaigns */}
                <div style={{ padding: '6px 16px', background: 'var(--bg)', fontWeight: 700, fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' }}>
                  📢 Campaigns Timeline
                </div>

                {campaigns.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: '.8rem', color: 'var(--text-3)' }}>No campaigns listed.</div>
                ) : (
                  campaigns.map(c => {
                    const span = getGanttSpan(c.startDate, c.endDate);
                    const conflicts = checkConflicts(c);
                    const col = getStatusColor(c.status, false);

                    return (
                      <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '260px 1fr', borderBottom: '1px solid var(--border)', alignValues: 'center' }}>
                        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '.8rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={c.name}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            {formatDate(c.startDate)} – {formatDate(c.endDate)}
                            {conflicts.length > 0 && (
                              <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 2 }} title={`Overlaps with: ${conflicts.map(co => co.name).join(', ')}`}>
                                <AlertTriangle size={10} /> Conflict
                              </span>
                            )}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, position: 'relative', borderLeft: '1px solid var(--border)', background: 'var(--bg-alt-light)' }}>
                          {/* Grid line separators */}
                          {dayColumns.map(d => (
                            <div key={d} style={{ borderRight: '1px solid var(--border-light)', height: '100%' }} />
                          ))}
                          
                          {/* Render horizontal span bar */}
                          {span && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${span.startOffset}%`,
                                width: `${span.widthPercent}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 18,
                                background: `linear-gradient(90deg, ${col}ee, ${col})`,
                                borderRadius: 4,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 8px',
                                fontSize: '.65rem',
                                color: '#fff',
                                fontWeight: 700,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                              title={`${c.name} (${c.status.toUpperCase()})`}
                            >
                              {c.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Section header: Events */}
                <div style={{ padding: '6px 16px', background: 'var(--bg)', fontWeight: 700, fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                  🎓 Campus Activations & Events
                </div>

                {events.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: '.8rem', color: 'var(--text-3)' }}>No events listed.</div>
                ) : (
                  events.map(e => {
                    const span = getGanttSpan(e.startDate || e.date, e.endDate || e.date);
                    const conflicts = checkConflicts(e, true);
                    const col = getStatusColor(e.status, true);

                    return (
                      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '260px 1fr', borderBottom: '1px solid var(--border)', alignValues: 'center' }}>
                        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '.8rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={e.title || e.name}>
                            {e.title || e.name}
                          </span>
                          <span style={{ fontSize: '.68rem', color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            {formatDate(e.startDate || e.date)}
                            {conflicts.length > 0 && (
                              <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 2 }} title={`Overlaps with: ${conflicts.map(co => co.name).join(', ')}`}>
                                <AlertTriangle size={10} /> Conflict
                              </span>
                            )}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, position: 'relative', borderLeft: '1px solid var(--border)', background: 'var(--bg-alt-light)' }}>
                          {/* Grid line separators */}
                          {dayColumns.map(d => (
                            <div key={d} style={{ borderRight: '1px solid var(--border-light)', height: '100%' }} />
                          ))}
                          
                          {/* Render horizontal span bar */}
                          {span && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${span.startOffset}%`,
                                width: `${span.widthPercent}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                height: 18,
                                background: `linear-gradient(90deg, ${col}ee, ${col})`,
                                borderRadius: 4,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 8px',
                                fontSize: '.65rem',
                                color: '#fff',
                                fontWeight: 700,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                              title={`${e.title || e.name} (${e.status.toUpperCase()})`}
                            >
                              {e.title || e.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
