import { useState, useEffect } from 'react';
import { useSession } from '../contexts/AppContext';
import {
  getDashboardStats, getActivityLog, getFinanceSummary,
  formatINR, timeAgo, ZONES, getZoneColor,
  CollegeDB, InfluencerDB, VendorDB, TaskDB, RevenueDB, ReimbDB,
  LeadDB, ClientDB, CampaignDB, EventDB, AnnouncementDB,
  LEAD_STATUSES, LEAD_STATUS_LABELS, CAMPAIGN_STATUS_LABELS
} from '../lib/data';
import { callGeminiAI } from '../lib/gemini';
import {
  School, Handshake, Star, CheckSquare, TrendingUp, Users, Globe,
  ArrowUp, ArrowDown, AlertCircle, Activity, Plus, Clock, Sparkles, Loader2,
  Target, Building2, Megaphone, CalendarDays, DollarSign, Zap, BarChart3,
  ArrowRight, Eye, TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar
} from 'recharts';

// Lead funnel colors
const FUNNEL_COLORS = {
  new: '#3b82f6', contacted: '#7c3aed', qualified: '#0f766e',
  proposal_sent: '#ea580c', negotiation: '#f59e0b', won: '#10b981', lost: '#ef4444'
};

export default function Dashboard() {
  const session = useSession();
  const nav = useNavigate();
  const stats = getDashboardStats();
  const fin = getFinanceSummary();
  const log = getActivityLog(8);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    AnnouncementDB.syncFromDB().then(rows => setAnnouncements(rows));
  }, []);

  // Dynamic aggregation for last 6 months
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const revenues = RevenueDB.all();
  const claims = ReimbDB.all();
  const leads = LeadDB.all();
  const clients = ClientDB.all();
  const campaigns = CampaignDB.all();
  const events = EventDB.all();
  
  const dashboardDataMap = {};
  const currentMonthIdx = new Date().getMonth();
  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    dashboardDataMap[idx] = { m: MONTH_LABELS[idx], rev: 0, exp: 0, leads: 0 };
  }
  
  // Sum revenues
  revenues.forEach(r => {
    if (!r.invoiceDate) return;
    const parts = r.invoiceDate.split('-');
    if (parts.length < 2) return;
    const mIdx = parseInt(parts[1], 10) - 1;
    if (dashboardDataMap[mIdx]) dashboardDataMap[mIdx].rev += (r.amount || 0);
  });

  // Sum expenses
  claims.filter(r => r.status === 'approved').forEach(r => {
    if (!r.date) return;
    const parts = r.date.split('-');
    if (parts.length < 2) return;
    const mIdx = parseInt(parts[1], 10) - 1;
    if (dashboardDataMap[mIdx]) dashboardDataMap[mIdx].exp += (r.amount || 0);
  });

  // Sum lead creation by month
  leads.forEach(l => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const mIdx = d.getMonth();
    if (dashboardDataMap[mIdx]) dashboardDataMap[mIdx].leads += 1;
  });

  const dynamicRevenueData = Object.keys(dashboardDataMap)
    .sort((a, b) => {
      const distA = (parseInt(a) - currentMonthIdx + 12) % 12;
      const distB = (parseInt(b) - currentMonthIdx + 12) % 12;
      return distA - distB;
    })
    .map(key => dashboardDataMap[key]);

  const [query, setQuery] = useState('');
  const [consulting, setConsulting] = useState(false);
  const [aiReport, setAiReport] = useState('');

  async function handleConsultAI(customQuery) {
    const q = (typeof customQuery === 'string' ? customQuery : query).trim();
    if (!q) return;
    setConsulting(true);
    setAiReport('');
    try {
      const colleges = CollegeDB.all();
      const influencers = InfluencerDB.all();
      const vendors = VendorDB.all();
      const tasks = TaskDB.all();
      const finances = getFinanceSummary();
      const systemPrompt = `You are VigorCRM AI, an operations and growth strategy advisor for VigorLaunchpad, a premium college marketing and BTL activation agency.
Below is the live CRM database content:

---
COLLEGES DATABASE (${colleges.length} records):
${JSON.stringify(colleges.map(c => ({ name: c.name, city: c.city, state: c.state, zone: c.zone, status: c.status, festName: c.festName, festBudget: c.festBudget, contactsCount: (c.contacts || []).length })), null, 2)}

INFLUENCERS DATABASE (${influencers.length} records):
${JSON.stringify(influencers.map(i => ({ name: i.name, type: i.type, followers: i.followers, genre: i.genre, college: i.collegeName, city: i.city, tier: i.tier, status: i.status })), null, 2)}

VENDORS DATABASE (${vendors.length} records):
${JSON.stringify(vendors.map(v => ({ name: v.name, region: v.region, company: v.companyName, city: v.city, category: v.category, manPower: v.manPower, status: v.status })), null, 2)}

TASKS DATABASE (${tasks.length} records):
${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, dept: t.dept, deadline: t.deadline })), null, 2)}

LEADS DATABASE (${leads.length} records):
${JSON.stringify(leads.map(l => ({ brand: l.brandName, status: l.status, dealValue: l.dealValue, source: l.source, priority: l.priority })), null, 2)}

CLIENTS DATABASE (${clients.length} records):
${JSON.stringify(clients.map(c => ({ brand: c.brandName, contractValue: c.contractValue, status: c.status })), null, 2)}

CAMPAIGNS DATABASE (${campaigns.length} records):
${JSON.stringify(campaigns.map(c => ({ name: c.name, status: c.status, budget: c.budget, spent: c.spent, type: c.campaignType })), null, 2)}

FINANCIAL SUMMARY:
- Total Revenue: ₹${finances.totalRevenue.toLocaleString('en-IN')}
- Pending Invoices: ₹${finances.pendingInvoice.toLocaleString('en-IN')}
- Total Operational Expenses: ₹${finances.totalExpense.toLocaleString('en-IN')}
- Net Profit/Loss: ₹${finances.netPL.toLocaleString('en-IN')}
- Active Budgets: ₹${finances.totalBudgeted.toLocaleString('en-IN')}
- Budget Spent: ₹${finances.totalSpent.toLocaleString('en-IN')}
- Budget Remaining: ₹${finances.budgetRemaining.toLocaleString('en-IN')}
---

Answer the user's query by analyzing the database above. If they ask for advice, lists, filters, stats, or analysis, compute it based exactly on the live data. Keep your responses direct, professional, formatting-rich (markdown bullet points, tables, bold text), and actionable.

User Query: "${q}"`;
      const text = await callGeminiAI(systemPrompt, { temperature: 0.2, maxTokens: 1500 });
      setAiReport(text || 'No response from AI.');
    } catch (e) {
      console.error(e);
      setAiReport(e.message || 'Could not analyze database. Check connection or API key.');
    } finally {
      setConsulting(false);
    }
  }

  // Build chart data
  const tasks = TaskDB.all();
  const taskChart = [
    { name:'To Do',      value: tasks.filter(t=>t.status==='todo').length,       color:'#94a3b8' },
    { name:'In Progress',value: tasks.filter(t=>t.status==='inprogress').length, color:'#3b82f6' },
    { name:'In Review',  value: tasks.filter(t=>t.status==='review').length,      color:'#f59e0b' },
    { name:'Done',       value: tasks.filter(t=>t.status==='done').length,         color:'#10b981' },
  ];

  // Lead funnel data
  const leadFunnel = LEAD_STATUSES.map(s => ({
    name: LEAD_STATUS_LABELS[s],
    value: leads.filter(l => l.status === s).length,
    color: FUNNEL_COLORS[s],
    key: s
  }));

  // Campaign status data for donut
  const campStatusData = ['planning','active','in_progress','live','completed'].map(s => ({
    name: CAMPAIGN_STATUS_LABELS[s] || s,
    value: campaigns.filter(c => c.status === s).length,
  }));
  const CAMP_COLORS = ['#6b7280','#3b82f6','#ea580c','#10b981','#0f766e'];

  // Lead sources data
  const leadSourceData = {};
  leads.forEach(l => { if(l.source) leadSourceData[l.source] = (leadSourceData[l.source]||0) + 1; });
  const sourceChart = Object.entries(leadSourceData).map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const SOURCE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];

  // Influencer tiers
  const tierData = ['Nano','Micro','Mid Micro','Macro','Mega'].map(n => ({name:n, count:0}));
  InfluencerDB.all().forEach(i => {
    const t = i.tier || 'Nano';
    const ex = tierData.find(a=>a.name===t);
    if (ex) ex.count++;
  });
  const TIER_COLORS = ['#10b981','#3b82f6','#0ea5e9','#8b5cf6','#f59e0b'];

  const activityIcons = {
    College:'#dbeafe', Influencer:'#ede9fe', Vendor:'#d1fae5', Task:'#fef3c7',
    Reimbursement:'#fee2e2', Lead:'#e0e7ff', Client:'#d1fae5', Campaign:'#fce7f3', Event:'#cffafe'
  };
  const activityIconsText = {
    College: School, Influencer: Star, Vendor: Handshake, Task: CheckSquare,
    Reimbursement: TrendingUp, Lead: Target, Client: Building2, Campaign: Megaphone, Event: CalendarDays
  };

  // Summary calculations
  const totalContractValue = clients.reduce((s,c)=>s+(c.contractValue||0),0);
  const totalCampBudget = campaigns.reduce((s,c)=>s+(c.budget||0),0);
  const totalCampSpent = campaigns.reduce((s,c)=>s+(c.spent||0),0);
  const pipelineValue = leads.filter(l=>!['won','lost'].includes(l.status)).reduce((s,l)=>s+(l.dealValue||0),0);
  const winRate = leads.length > 0 ? Math.round((leads.filter(l=>l.status==='won').length / leads.filter(l=>['won','lost'].includes(l.status)).length || 0) * 100) : 0;

  return (
    <div>
      <div className="page-body">
        {/* Welcome Banner */}
        <div className="dash-welcome-banner">
          <div className="dash-welcome-left">
            <h1 className="dash-welcome-title">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {session?.name?.split(' ')[0]} 👋</h1>
            <p className="dash-welcome-sub">Here's a quick overview of your business performance today.</p>
          </div>
          <div className="dash-welcome-right">
            <button className="btn btn-primary btn-sm" onClick={() => nav('/leads')}><Plus size={13}/> New Lead</button>
            <button className="btn btn-secondary btn-sm" onClick={() => nav('/campaigns')}><Megaphone size={13}/> New Campaign</button>
          </div>
        </div>

        {/* Announcements Notice Bar */}
        {announcements.length > 0 && (
          <div className="dash-notice-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--purple)', flexShrink: 0 }}>
              <Megaphone size={14} className="pulse" />
              <span>HR Announcement:</span>
            </div>
            <marquee style={{ cursor: 'pointer' }} onClick={() => nav('/leaves')}>
              {announcements.map((a, idx) => (
                <span key={a.id} style={{ marginRight: 64 }}>
                  <strong>{a.title}</strong>: {a.content}
                </span>
              ))}
            </marquee>
          </div>
        )}

        {/* KPI ROW — Key Metrics Only */}
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', marginBottom: 20}}>
          {[
            { label:'Colleges',        value:stats.colleges,    icon:School,      c:'#2563eb', bg:'#eff6ff', to:'/colleges' },
            { label:'Influencers',     value:stats.influencers, icon:Star,        c:'#8b5cf6', bg:'#f5f3ff', to:'/influencers' },
            { label:'Vendors',         value:stats.vendors,     icon:Handshake,   c:'#10b981', bg:'#ecfdf5', to:'/vendors' },
            { label:'Active Leads',    value:stats.activeLeads||0, icon:Target,   c:'#7c3aed', bg:'#f5f3ff', to:'/leads' },
            { label:'Active Tasks',    value:tasks.filter(t=>t.status!=='done').length, icon:CheckSquare, c:'#f59e0b', bg:'#fffbeb', to:'/tasks' },
            { label:'Overdue',         value:stats.overdueTasks, icon:AlertCircle, c:'#ef4444', bg:'#fef2f2', to:'/tasks' },
            { label:'Team Members',    value:stats.users,       icon:Users,       c:'#0ea5e9', bg:'#f0f9ff', to:'/users' },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c,'--kpi-bg':k.bg, cursor:'pointer'}} onClick={() => nav(k.to)}>
                <div className="kpi-icon" style={{background:k.bg}}><Icon size={18} color={k.c}/></div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            );
          })}
        </div>

        {/* ROW 2: Revenue Chart + Lead Funnel */}
        <div className="charts-2" style={{marginBottom:16}}>
          {/* Revenue & Expense Trend */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Revenue & Expense Trend</div><div className="card-subtitle">Last 6 months overview</div></div>
              <div style={{display:'flex',gap:14}}>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:'.7rem',color:'var(--text-2)'}}>
                  <div style={{width:10,height:3,borderRadius:2,background:'#2563eb'}}/> Revenue
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:'.7rem',color:'var(--text-2)'}}>
                  <div style={{width:10,height:3,borderRadius:2,background:'#10b981'}}/> Expense
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{height:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicRevenueData} margin={{top:5,right:10,left:-10,bottom:0}}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="m" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>formatINR(v)}/>
                    <Tooltip contentStyle={{borderRadius:8,border:'1px solid #e5e7eb',boxShadow:'0 4px 12px rgba(0,0,0,.08)'}} formatter={(v,n)=>[formatINR(v),n==='rev'?'Revenue':'Expense']} labelStyle={{fontWeight:700}}/>
                    <Area type="monotone" dataKey="rev" name="rev" stroke="#2563eb" fill="url(#revGrad)" strokeWidth={2.5} dot={{r:3,fill:'#2563eb'}}/>
                    <Area type="monotone" dataKey="exp" name="exp" stroke="#10b981" fill="url(#expGrad)" strokeWidth={2} dot={{r:3,fill:'#10b981'}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Finance Summary Footer */}
              <div className="dash-finance-row">
                {[
                  { label:'Total Revenue', value:formatINR(fin.totalRevenue), c:'#2563eb', icon:ArrowUp },
                  { label:'Total Expense', value:formatINR(fin.totalExpense), c:'#ef4444', icon:ArrowDown },
                  { label:'Pending Invoices', value:formatINR(fin.pendingInvoice), c:'#f59e0b', icon:Clock },
                  { label:'Net P&L', value:formatINR(fin.netPL), c: fin.netPL>=0?'#10b981':'#ef4444', icon: fin.netPL>=0?TrendingUp:TrendingDown },
                ].map(f => {
                  const FIcon = f.icon;
                  return (
                    <div key={f.label} className="dash-finance-item">
                      <div className="dash-finance-icon"><FIcon size={13} color={f.c}/></div>
                      <div>
                        <div className="dash-finance-label">{f.label}</div>
                        <div className="dash-finance-value" style={{color:f.c}}>{f.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lead Pipeline Funnel */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Lead Pipeline</div><div className="card-subtitle">Funnel breakdown</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>nav('/leads')}><Eye size={13}/> View All</button>
            </div>
            <div className="card-body">
              <div className="lead-funnel">
                {leadFunnel.map(stage => {
                  const maxVal = Math.max(...leadFunnel.map(s=>s.value), 1);
                  const pct = Math.max(12, (stage.value / maxVal) * 100);
                  return (
                    <div key={stage.key} className="funnel-row" onClick={()=>nav('/leads')}>
                      <div className="funnel-label">{stage.name}</div>
                      <div className="funnel-bar-track">
                        <div className="funnel-bar-fill" style={{width:`${pct}%`, background:stage.color}} />
                      </div>
                      <div className="funnel-count" style={{color:stage.color}}>{stage.value}</div>
                    </div>
                  );
                })}
              </div>
              {/* Win rate + Pipeline value */}
              <div style={{display:'flex',gap:12,marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                <div className="dash-mini-stat">
                  <div className="dash-mini-value" style={{color:'#10b981'}}>{winRate || 0}%</div>
                  <div className="dash-mini-label">Win Rate</div>
                </div>
                <div className="dash-mini-stat">
                  <div className="dash-mini-value" style={{color:'#2563eb'}}>{formatINR(pipelineValue)}</div>
                  <div className="dash-mini-label">Pipeline</div>
                </div>
                <div className="dash-mini-stat">
                  <div className="dash-mini-value" style={{color:'#7c3aed'}}>{leads.length}</div>
                  <div className="dash-mini-label">Total Leads</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Campaign + Task + Influencer + Lead Source */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:16}}>
          {/* Campaign Status Donut */}
          <div className="card">
            <div className="card-header"><div className="card-title">Campaign Status</div></div>
            <div className="card-body" style={{padding:'12px 14px'}}>
              <div style={{height:140}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={campStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {campStatusData.map((e,i) => <Cell key={i} fill={CAMP_COLORS[i]} stroke="none"/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v,n]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {campStatusData.filter(d=>d.value>0).map((t,i)=>(
                  <div key={t.name} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.62rem',color:'var(--text-2)'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:CAMP_COLORS[i],flexShrink:0}}/> {t.name} ({t.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Status Donut */}
          <div className="card">
            <div className="card-header"><div className="card-title">Task Status</div></div>
            <div className="card-body" style={{padding:'12px 14px'}}>
              <div style={{height:140}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskChart} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {taskChart.map((entry,i) => <Cell key={i} fill={entry.color} stroke="none"/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v,n]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {taskChart.map(t=>(
                  <div key={t.name} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.62rem',color:'var(--text-2)'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:t.color,flexShrink:0}}/> {t.name} ({t.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Influencer Tiers */}
          <div className="card">
            <div className="card-header"><div className="card-title">Influencer Tiers</div></div>
            <div className="card-body" style={{padding:'12px 14px'}}>
              <div style={{height:140}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierData} margin={{top:5,right:0,left:-25,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip/>
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {tierData.map((e,i)=><Cell key={i} fill={TIER_COLORS[i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {tierData.map((t,i)=>(
                  <div key={t.name} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.62rem',color:'var(--text-2)'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:TIER_COLORS[i],flexShrink:0}}/> {t.name} ({t.count})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lead Sources */}
          <div className="card">
            <div className="card-header"><div className="card-title">Lead Sources</div></div>
            <div className="card-body" style={{padding:'12px 14px'}}>
              {sourceChart.length > 0 ? (
                <>
                  <div style={{height:140}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sourceChart} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {sourceChart.map((e,i)=><Cell key={i} fill={SOURCE_COLORS[i%SOURCE_COLORS.length]} stroke="none"/>)}
                        </Pie>
                        <Tooltip/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                    {sourceChart.map((t,i)=>(
                      <div key={t.name} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.62rem',color:'var(--text-2)'}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:SOURCE_COLORS[i%SOURCE_COLORS.length],flexShrink:0}}/> {t.name} ({t.value})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="center" style={{height:180,color:'var(--text-3)',fontSize:'.82rem',flexDirection:'column',gap:6}}>
                  <Target size={24} color="var(--border-2)"/>
                  <span>Add leads to see source distribution</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: Zone Overview + Activity Feed */}
        <div className="grid-2">
          {/* Zone mini grid */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">VigorSpace Zones</div><div className="card-subtitle">College & vendor coverage by region</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>nav('/vigorspace')}><Globe size={13}/> View All</button>
            </div>
            <div className="card-body">
              <div style={{display:'grid',gap:8}}>
                {Object.values(ZONES).map(z => {
                  const zc = stats.zoneStats[z.key] || {colleges:0,vendors:0};
                  return (
                    <div key={z.key} onClick={()=>nav('/vigorspace')} style={{
                      display:'flex',alignItems:'center',gap:12,padding:'8px 12px',
                      background:'var(--bg)',borderRadius:'var(--r-sm)',cursor:'pointer',
                      border:'1px solid var(--border)',transition:'all .15s',
                    }} onMouseEnter={e=>e.currentTarget.style.borderColor=z.color}
                       onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:z.color,flexShrink:0}}/>
                      <div style={{flex:1,fontSize:'.82rem',fontWeight:600}}>{z.label}</div>
                      <div style={{display:'flex',gap:16}}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'.9rem',fontWeight:800,color:z.color}}>{zc.colleges}</div>
                          <div style={{fontSize:'.62rem',color:'var(--text-3)'}}>Colleges</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'.9rem',fontWeight:800,color:z.color}}>{zc.vendors}</div>
                          <div style={{fontSize:'.62rem',color:'var(--text-3)'}}>Vendors</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Recent Activity</div><div className="card-subtitle">Latest team actions</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>nav('/reports')}><Activity size={13}/> Full Log</button>
            </div>
            <div className="card-body" style={{padding:'12px 18px'}}>
              <div className="activity-list">
                {log.length === 0 && (
                  <div className="center" style={{height:120,color:'var(--text-3)',fontSize:'.82rem',flexDirection:'column',gap:6}}>
                    <Activity size={24} color="var(--border-2)"/>
                    <span>No recent activity</span>
                  </div>
                )}
                {log.map(a => {
                  const Icon = activityIconsText[a.entityType] || Activity;
                  const bg = activityIcons[a.entityType] || '#f3f4f6';
                  return (
                    <div key={a.id} className="activity-item">
                      <div className="activity-icon" style={{background:bg}}>
                        <Icon size={13} color="var(--text-2)"/>
                      </div>
                      <div className="activity-text">
                        <strong>{a.userName}</strong> {a.action?.toLowerCase()} {a.entityType?.toLowerCase()} <strong>{a.entityName}</strong>
                        {a.extra ? ` — ${a.extra}` : ''}
                      </div>
                      <div className="activity-time"><Clock size={10}/> {timeAgo(a.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: AI Advisor */}
        {['founder', 'admin', 'hr', 'operations'].includes(session?.role) && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{display:'flex',alignItems:'center',gap:6}}>
                  <Sparkles size={16} color="var(--purple)"/> AI Database Advisor
                </div>
                <div className="card-subtitle">Ask any question about your CRM data — Leads, Clients, Campaigns, Tasks, Finance</div>
              </div>
              <span className="badge badge-purple"><Sparkles size={10}/> Powered by Gemini</span>
            </div>
            <div className="card-body">
              <div className="grid-2">
                <div>
                  <div className="section-title">Query the Database</div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <textarea
                      className="input"
                      style={{ height: 100, resize: 'vertical', fontSize: '.85rem', fontFamily: 'inherit', padding: '10px 12px' }}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="e.g., What's our lead conversion rate? Which campaigns are over budget?"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                      Quick Suggestions
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        'Summarise my full database stats.',
                        'What is our lead conversion rate?',
                        'Which campaigns are over budget?',
                        'List all high-priority pending tasks.',
                        'Show client contract values breakdown.',
                        'Which zones need more vendors?',
                      ].map(s => (
                        <button key={s} type="button" className="btn btn-secondary btn-sm"
                          style={{ fontSize: '.72rem', padding: '4px 10px', height: 'auto', border: '1px solid var(--border)' }}
                          onClick={() => { setQuery(s); handleConsultAI(s); }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button className="btn btn-ai w-full" onClick={() => handleConsultAI()} disabled={consulting || !query.trim()}>
                    {consulting ? <Loader2 size={13} className="spinner" style={{ marginRight: 6 }} /> : <Sparkles size={13} style={{ marginRight: 6 }} />}
                    Analyse Database & Answer →
                  </button>
                </div>

                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="var(--purple)" /> AI Response Console
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)',
                    border: '1.5px solid #dbeafe',
                    borderRadius: 'var(--r)',
                    padding: 16,
                    fontSize: '.82rem',
                    minHeight: 220,
                    maxHeight: 340,
                    overflowY: 'auto',
                    color: '#1f2937',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    {consulting ? (
                      <div className="center" style={{ minHeight: 180, flexDirection: 'column', gap: 8, color: 'var(--text-3)' }}>
                        <Loader2 size={24} className="spinner" />
                        <span>Scanning database and formulating response…</span>
                      </div>
                    ) : aiReport ? aiReport : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, color: 'var(--text-3)', textAlign: 'center' }}>
                        <Sparkles size={28} color="var(--purple)" style={{ marginBottom: 8, opacity: 0.6 }} />
                        Type a question on the left or select a quick suggestion to analyse your CRM records.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
