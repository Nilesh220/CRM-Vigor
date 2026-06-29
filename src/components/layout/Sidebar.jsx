import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { ROLE_LABELS, ROLE_NAV } from '../../lib/data';
import {
  LayoutDashboard, Globe, School, Handshake, Star, CheckSquare,
  TrendingUp, FileBarChart, Users, LogOut, ChevronDown,
  Target, Building2, Megaphone, CalendarDays, Crosshair, BookOpen, MapPin
} from 'lucide-react';

const ALL_NAV = [
  { key:'dashboard',   label:'Dashboard',     icon:LayoutDashboard, to:'/',           section:null },
  { section:'Sales' },
  { key:'leads',       label:'Leads',         icon:Target,          to:'/leads',      section:'leads' },
  { key:'clients',     label:'Clients',       icon:Building2,       to:'/clients',    section:'clients' },
  { key:'campaigns',   label:'Campaigns',     icon:Megaphone,       to:'/campaigns',  section:'campaigns' },
  { key:'events',      label:'Events',        icon:CalendarDays,    to:'/events',     section:'events' },
  { section:'VigorSpace' },
  { key:'vigorspace',  label:'Zone Overview', icon:Globe,           to:'/vigorspace', section:'vigorspace' },
  { key:'colleges',    label:'Colleges',      icon:School,          to:'/colleges',   section:'vigorspace', indent:true },
  { key:'vendors',     label:'Vendors',       icon:Handshake,       to:'/vendors',    section:'vigorspace', indent:true },
  { key:'college_influencers', label:'Ambassadors', icon:Star,      to:'/vigorspace/college-influencers', section:'vigorspace', indent:true },
  { key:'vigorspace', label:'Map View', icon:MapPin, to:'/map-view', section:'vigorspace', indent:true },
  { section:'Team' },
  { key:'influencers', label:'Influencers',   icon:Star,            to:'/influencers',section:'influencers' },
  { key:'tasks',       label:'Tasks',         icon:CheckSquare,     to:'/tasks',      section:'tasks' },
  { key:'leaves',      label:'Leave Planner', icon:CalendarDays,    to:'/leaves',     section:'leaves' },
  { section:'Strategy' },
  { key:'okrs',        label:'OKR Tracker',   icon:Crosshair,       to:'/okrs',       section:'okrs' },
  { key:'timeline',    label:'Campaign Timeline', icon:CalendarDays, to:'/timeline',   section:'timeline' },
  { key:'sops',        label:'SOP Library',   icon:BookOpen,        to:'/sops',       section:'sops' },
  { section:'Business' },
  { key:'finance',     label:'Finance',       icon:TrendingUp,      to:'/finance',    section:'finance' },
  { key:'reports',     label:'Reports',       icon:FileBarChart,    to:'/reports',    section:'reports' },
  { section:'Admin' },
  { key:'users',       label:'User Management',icon:Users,          to:'/users',      section:'users' },
];

export default function Sidebar() {
  const { session, logout } = useApp();
  const nav = useNavigate();
  const allowed = session?.allowedNav || ROLE_NAV[session?.role] || [];
  const initials = session?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U';

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <aside className="sidebar">
      {/* Brand — real logo */}
      <div className="sidebar-brand">
        <img
          src="/vigor-logo-new-01.png"
          alt="VigorLaunchpad"
          className="sidebar-logo-img"
        />
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="avatar">{initials}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="user-name" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session?.name}</div>
          <div className="user-role">{ROLE_LABELS[session?.role] || session?.role}</div>
        </div>
        <ChevronDown size={13} color="var(--text-3)" />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {ALL_NAV.map((item, i) => {
          if (item.section && !item.key) {
            let sectionKeys = [];
            if (item.section === 'Sales') sectionKeys = ['leads', 'clients', 'campaigns', 'events'];
            else if (item.section === 'VigorSpace') sectionKeys = ['vigorspace', 'colleges', 'vendors', 'college_influencers'];
            else if (item.section === 'Team') sectionKeys = ['influencers', 'tasks', 'leaves'];
            else if (item.section === 'Strategy') sectionKeys = ['okrs', 'timeline', 'sops'];
            else if (item.section === 'Business') sectionKeys = ['finance', 'reports'];
            else if (item.section === 'Admin') sectionKeys = ['users'];

            const hasVisible = sectionKeys.some(k => allowed.includes(k));
            if (!hasVisible) return null;
            return <div key={i} className="nav-section-label">{item.section}</div>;
          }
          if (!item.key) return null;
          if (!allowed.includes(item.key)) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/'}
              className={({isActive}) => `nav-item ${item.indent ? 'nav-sub' : ''} ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item logout w-full" onClick={handleLogout}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
