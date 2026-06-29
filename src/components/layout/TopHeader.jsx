import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  LeadDB, ClientDB, CampaignDB, EventDB, InfluencerDB, VendorDB, CollegeDB, TaskDB,
  LEAD_STATUS_LABELS, CAMPAIGN_STATUS_LABELS, getActivityLog, timeAgo
} from '../../lib/data';
import { Search, Bell, Moon, Sun, X, ArrowRight } from 'lucide-react';

export default function TopHeader() {
  const { session } = useApp();
  const nav = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [notiOpen, setNotiOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('vlcrm_dark') === '1');
  const searchRef = useRef();
  const notiRef = useRef();

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', dark);
    localStorage.setItem('vlcrm_dark', dark ? '1' : '0');
  }, [dark]);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setQuery(''); setResults([]); }
      if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Global search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const res = [];

    // Search leads
    LeadDB.all().filter(l => [l.brandName, l.pocName, l.pocEmail].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(l => res.push({ type: 'Lead', name: l.brandName, sub: l.pocName || LEAD_STATUS_LABELS[l.status], link: '/leads' }));

    // Search clients
    ClientDB.all().filter(c => [c.brandName, c.companyName, c.pocName].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(c => res.push({ type: 'Client', name: c.brandName, sub: c.pocName, link: '/clients' }));

    // Search campaigns
    CampaignDB.all().filter(c => [c.name, c.clientName, c.campaignType].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(c => res.push({ type: 'Campaign', name: c.name, sub: c.clientName || CAMPAIGN_STATUS_LABELS[c.status], link: '/campaigns' }));

    // Search influencers
    InfluencerDB.all().filter(i => [i.name, i.city, i.category].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(i => res.push({ type: 'Influencer', name: i.name, sub: i.city, link: '/influencers' }));

    // Search vendors
    VendorDB.all().filter(v => [v.name, v.company, v.city].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(v => res.push({ type: 'Vendor', name: v.name || v.company, sub: v.city, link: '/vendors' }));

    // Search events
    EventDB.all().filter(e => [e.name, e.venue, e.city, e.eventType].join(' ').toLowerCase().includes(q))
      .slice(0, 3).forEach(e => res.push({ type: 'Event', name: e.name, sub: e.city, link: '/events' }));

    setResults(res.slice(0, 12));
  }, [query]);

  // Notifications from activity log
  const notifications = getActivityLog(8);
  const initials = session?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="top-header">
      {/* Global Search */}
      <div className="header-search-area" ref={searchRef}>
        <div className={`header-search ${searchOpen ? 'expanded' : ''}`}>
          <Search size={15} className="header-search-icon" />
          <input
            placeholder="Search leads, clients, campaigns, influencers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
          {query && (
            <button className="header-search-clear" onClick={() => { setQuery(''); setResults([]); }}>
              <X size={13} />
            </button>
          )}
        </div>
        {searchOpen && results.length > 0 && (
          <div className="header-search-results">
            {results.map((r, i) => (
              <button key={i} className="search-result-item" onClick={() => { nav(r.link); setSearchOpen(false); setQuery(''); setResults([]); }}>
                <span className="search-result-type">{r.type}</span>
                <div style={{ flex: 1 }}>
                  <div className="search-result-name">{r.name}</div>
                  {r.sub && <div className="search-result-sub">{r.sub}</div>}
                </div>
                <ArrowRight size={12} color="var(--text-3)" />
              </button>
            ))}
          </div>
        )}
        {searchOpen && query && results.length === 0 && (
          <div className="header-search-results">
            <div style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: '.82rem' }}>
              No results found for "{query}"
            </div>
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="header-actions">
        {/* Dark mode toggle */}
        <button className="header-action-btn" onClick={() => setDark(!dark)} title={dark ? 'Light Mode' : 'Dark Mode'}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div className="header-noti-wrap" ref={notiRef}>
          <button className="header-action-btn" onClick={() => setNotiOpen(!notiOpen)} title="Notifications">
            <Bell size={17} />
            {notifications.length > 0 && <span className="noti-badge">{Math.min(notifications.length, 9)}</span>}
          </button>
          {notiOpen && (
            <div className="header-noti-dropdown">
              <div className="noti-header">
                <span style={{ fontWeight: 700, fontSize: '.85rem' }}>Notifications</span>
                <span className="text-xs text-muted">{notifications.length} recent</span>
              </div>
              <div className="noti-list">
                {notifications.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '.82rem' }}>No notifications</div>
                )}
                {notifications.map((n, i) => (
                  <div key={i} className="noti-item">
                    <div className="noti-text">
                      <strong>{n.userName}</strong> {n.action?.toLowerCase()} {n.entityType?.toLowerCase()} <strong>{n.entityName}</strong>
                      {n.extra && <span className="text-muted"> {n.extra}</span>}
                    </div>
                    <div className="noti-time">{timeAgo(n.timestamp)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="header-user">
          <div className="avatar avatar-sm">{initials}</div>
          <div className="header-user-info">
            <div className="header-user-name">{session?.name}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
