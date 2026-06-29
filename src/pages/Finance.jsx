import { useState, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import { useToast, useSession } from '../contexts/AppContext';
import { ReimbDB, RevenueDB, BudgetDB, genId, logActivity, getFinanceSummary, formatINR, formatDate, canExport, getUserName, exportToCSV } from '../lib/data';
import { TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3, Plus, Download, Check, X, ArrowUpRight, FileText, Printer, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const REIMB_CATS = ['Travel','Food & Entertainment','Supplies','Equipment','Communication','Marketing','Other'];
const DEPTS = ['VigorSpace','Influencer Team','Finance','HR','Operations','Project Mgmt','Management'];
const REIMB_STATUS_COLORS = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red' };
const REV_STATUS_COLORS   = { paid:'badge-green', pending:'badge-yellow', overdue:'badge-red' };
const BUD_STATUS_COLORS   = { Active:'badge-green', Completed:'badge-gray', 'On Hold':'badge-yellow' };

export default function Finance() {
  const toast = useToast();
  const session = useSession();
  const isApprover = ['admin','founder','operations','hr','finance'].includes(session?.role);

  // Dynamic aggregation for last 6 months
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [reimbs, setReimbs] = useState(()=>ReimbDB.all());
  const [revenue, setRevenue] = useState(()=>RevenueDB.all());
  const [budgets, setBudgets] = useState(()=>BudgetDB.all());

  const monthlyDataMap = {};
  const currentMonthIdx = new Date().getMonth();
  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    monthlyDataMap[idx] = { m: MONTH_LABELS[idx], rev: 0, exp: 0 };
  }

  // Sum revenues
  revenue.forEach(r => {
    if (!r.invoiceDate) return;
    const parts = r.invoiceDate.split('-');
    if (parts.length < 2) return;
    const mIdx = parseInt(parts[1], 10) - 1;
    if (monthlyDataMap[mIdx]) {
      monthlyDataMap[mIdx].rev += (r.amount || 0);
    }
  });

  // Sum expenses (only approved reimbursements are counted as operational expenses)
  reimbs.filter(r => r.status === 'approved').forEach(r => {
    if (!r.date) return;
    const parts = r.date.split('-');
    if (parts.length < 2) return;
    const mIdx = parseInt(parts[1], 10) - 1;
    if (monthlyDataMap[mIdx]) {
      monthlyDataMap[mIdx].exp += (r.amount || 0);
    }
  });

  const dynamicMonthData = Object.keys(monthlyDataMap)
    .sort((a, b) => {
      const distA = (parseInt(a) - currentMonthIdx + 12) % 12;
      const distB = (parseInt(b) - currentMonthIdx + 12) % 12;
      return distA - distB; // oldest first
    })
    .map(key => monthlyDataMap[key]);

  const [tab, setTab] = useState(0);
  const [reimbModal, setReimbModal] = useState(false);
  const [revenueModal, setRevenueModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    ReimbDB.syncFromDB().then(rows => setReimbs(rows));
    RevenueDB.syncFromDB().then(rows => setRevenue(rows));
    BudgetDB.syncFromDB().then(rows => setBudgets(rows));
  }, []);

  const [rForm, setRForm] = useState({description:'',amount:'',category:'Travel',date:new Date().toISOString().slice(0,10),receiptUrl:''});
  const [revForm, setRevForm] = useState({clientName:'',campaignName:'',amount:'',invoiceDate:'',paymentStatus:'pending',paymentDate:'',description:''});
  const [budForm, setBudForm] = useState({campaignName:'',client:'',totalBudget:'',spentAmount:'0',dept:'VigorSpace',status:'Active',month:''});
  
  const [invForm, setInvForm] = useState({
    clientName: 'Pepsi India',
    address: 'DLF Cyber City, Sector 24, Gurugram, Haryana 122002',
    invoiceNo: 'VL/2026/084',
    invoiceDate: new Date().toISOString().slice(0,10),
    dueDate: new Date(Date.now() + 15*86400000).toISOString().slice(0,10),
    items: [
      { desc: 'BTL Campaign Activation — Symbiosis Pune & Christ Bangalore', qty: 1, rate: 450000 },
      { desc: 'Influencer Outreach & Content Creation (15 creators)', qty: 1, rate: 120000 },
    ],
    taxRate: 18,
    discount: 5000,
  });

  const fin = getFinanceSummary();
  const plColor = fin.netPL>=0 ? '#10b981' : '#ef4444';

  function refreshAll() { setReimbs(ReimbDB.all()); setRevenue(RevenueDB.all()); setBudgets(BudgetDB.all()); }

  async function submitReimb() {
    if (!rForm.description.trim()||!rForm.amount||!rForm.date) { toast('All fields required.','warning'); return; }
    const r = { id:genId('rei'), employeeId:session?.id, employeeName:session?.name, dept:session?.dept||'General',
      ...rForm, amount:parseFloat(rForm.amount), status:'pending', submittedAt:new Date().toISOString() };
    await ReimbDB.add(r);
    logActivity('Submitted','Reimbursement',session?.name,`₹${rForm.amount}`);
    toast('Reimbursement submitted!','success');
    setReimbModal(false); setRForm({description:'',amount:'',category:'Travel',date:new Date().toISOString().slice(0,10),receiptUrl:''});
    refreshAll();
  }
  async function addRevenue() {
    if (!revForm.clientName.trim()||!revForm.amount||!revForm.invoiceDate) { toast('Client, amount and date required.','warning'); return; }
    const r = { id:genId('rev'), ...revForm, amount:parseFloat(revForm.amount), createdAt:new Date().toISOString() };
    await RevenueDB.add(r);
    logActivity('Created','Revenue',revForm.clientName,formatINR(r.amount));
    toast('Revenue entry added!','success'); setRevenueModal(false); refreshAll();
  }
  async function addBudget() {
    if (!budForm.campaignName.trim()||!budForm.totalBudget) { toast('Campaign name and budget required.','warning'); return; }
    const r = { id:genId('bud'), ...budForm, totalBudget:parseFloat(budForm.totalBudget), spentAmount:parseFloat(budForm.spentAmount)||0, createdAt:new Date().toISOString() };
    await BudgetDB.add(r);
    logActivity('Created','Budget',budForm.campaignName,formatINR(r.totalBudget));
    toast('Budget created!','success'); setBudgetModal(false); refreshAll();
  }
  async function approveReimb(id) {
    await ReimbDB.update(id,{status:'approved',approvedBy:session?.id,approvedAt:new Date().toISOString()});
    const r=ReimbDB.get(id);
    logActivity('Approved','Reimbursement',r?.employeeName||id,`₹${r?.amount}`);
    toast('Approved!','success'); refreshAll();
  }
  function openReject(id) { setRejectId(id); setRejectReason(''); setRejectModal(true); }
  async function confirmReject() {
    await ReimbDB.update(rejectId,{status:'rejected',approvedBy:session?.id,approvedAt:new Date().toISOString(),rejectionReason:rejectReason});
    toast('Rejected.','warning'); setRejectModal(false); refreshAll();
  }
  function exportFin() {
    if (!canExport()) {toast('Export access denied.','error');return;}
    exportToCSV(ReimbDB.all(), 'VL_Finance.csv', {
      employeeName:'Employee', dept:'Dept', description:'Description',
      category:'Category', amount:'Amount', date:'Date', status:'Status'
    });
    logActivity('Exported','Finance','All reimbursements');
  }

  const AlertIcon = AlertCircle;

  const TABS = [
    {label:'Overview',icon:BarChart3},
    {label:'Revenue',icon:TrendingUp},
    {label:'Campaign Budgets',icon:DollarSign},
    {label:'Reimbursements',icon:Receipt},
    {label:'Invoice Generator',icon:FileText},
  ];

  // Budget utilization %
  const budUtil = b => b.totalBudget ? Math.round((b.spentAmount/b.totalBudget)*100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Finance & Revenue</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM &rsaquo; Finance</div>
        </div>
        <div className="page-header-right">
          {canExport()&&<button className="btn btn-secondary btn-sm" onClick={exportFin}><Download size={13}/> Export</button>}
          <button className="btn btn-secondary" onClick={()=>setReimbModal(true)}><Plus size={13}/> Reimbursement</button>
          {isApprover&&<button className="btn btn-primary" onClick={()=>setRevenueModal(true)}><Plus size={13}/> Revenue Entry</button>}
        </div>
      </div>
      <div className="page-body">
        {/* P&L Summary Row */}
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))'}}>
          {[
            {label:'Total Revenue',value:formatINR(fin.totalRevenue),c:'#10b981',bg:'#ecfdf5',icon:TrendingUp},
            {label:'Pending Invoices',value:formatINR(fin.pendingInvoice),c:'#f59e0b',bg:'#fffbeb',icon:Receipt},
            {label:'Total Expense',value:formatINR(fin.totalExpense),c:'#ef4444',bg:'#fef2f2',icon:TrendingDown},
            {label:'Net P&L',value:formatINR(fin.netPL),c:fin.netPL>=0?'#10b981':'#ef4444',bg:fin.netPL>=0?'#ecfdf5':'#fef2f2',icon:BarChart3},
            {label:'Budget Remaining',value:formatINR(fin.budgetRemaining),c:'#8b5cf6',bg:'#f5f3ff',icon:DollarSign},
            {label:'Pending Claims',value:fin.pendingReimbs,c:'#3b82f6',bg:'#eff6ff',icon:AlertIcon},
          ].map(k=>{
            const Icon=k.icon;
            return (
              <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
                <div className="kpi-icon" style={{background:k.bg}}>{Icon&&<Icon size={16} color={k.c}/>}</div>
                <div className="kpi-value" style={{fontSize:'1.35rem'}}>{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t,i)=>{
            const Icon=t.icon;
            return <button key={t.label} className={`tab-btn ${tab===i?'active':''}`} onClick={()=>setTab(i)}><Icon size={13}/>{t.label}</button>;
          })}
        </div>

        {/* TAB 0 — Overview */}
        {tab===0&&(
          <>
            <div className="charts-2">
              <div className="card">
                <div className="card-header"><div className="card-title">Revenue vs Expense — Monthly</div></div>
                <div className="card-body">
                  <div style={{height:250}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dynamicMonthData} margin={{top:0,right:10,left:-10,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="m" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>formatINR(v)}/>
                        <Tooltip formatter={(v,n)=>[formatINR(v),n==='rev'?'Revenue':'Expense']}/>
                        <Area type="monotone" dataKey="rev" name="rev" stroke="#10b981" fill="#d1fae5" strokeWidth={2.5}/>
                        <Area type="monotone" dataKey="exp" name="exp" stroke="#ef4444" fill="#fee2e2" strokeWidth={2.5}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">P&L Summary</div></div>
                <div className="card-body" style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="finance-pl-card">
                    <div className={`pl-value ${fin.netPL>=0?'pl-positive':'pl-negative'}`}>{formatINR(fin.netPL)}</div>
                    <div className="pl-label">Net Profit / Loss</div>
                  </div>
                  {[['Total Revenue',fin.totalRevenue,'#10b981'],['Pending Invoice',fin.pendingInvoice,'#f59e0b'],['Total Expense',fin.totalExpense,'#ef4444'],['Budget Total',fin.totalBudgeted,'#8b5cf6'],['Budget Spent',fin.totalSpent,'#3b82f6']].map(([l,v,c])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'.83rem',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{color:'var(--text-2)'}}>{l}</span>
                      <span style={{fontWeight:700,color:c}}>{formatINR(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Budget utilization bars */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Campaign Budget Utilization</div>
                <button className="btn btn-secondary btn-sm" onClick={()=>setBudgetModal(true)}><Plus size={12}/> Add Budget</button>
              </div>
              <div className="card-body">
                {budgets.map(b=>{
                  const pct=budUtil(b);
                  const c=pct>85?'#ef4444':pct>60?'#f59e0b':'#10b981';
                  return (
                    <div key={b.id} style={{marginBottom:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <div>
                          <span style={{fontWeight:600,fontSize:'.83rem'}}>{b.campaignName}</span>
                          <span style={{fontSize:'.72rem',color:'var(--text-3)',marginLeft:8}}>{b.client}</span>
                        </div>
                        <div style={{fontSize:'.78rem',fontWeight:700}}>
                          <span style={{color:c}}>{pct}%</span>
                          <span style={{color:'var(--text-3)'}}> · {formatINR(b.spentAmount)} / {formatINR(b.totalBudget)}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="progress-track">
                          <div className="progress-fill" style={{width:`${Math.min(pct,100)}%`,background:c}}/>
                        </div>
                        <span className={`badge ${BUD_STATUS_COLORS[b.status]||'badge-gray'}`} style={{fontSize:'.65rem'}}>{b.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* TAB 1 — Revenue */}
        {tab===1&&(
          <div className="card">
            <div className="card-header">
              <div className="card-title">Revenue & Invoices</div>
              {isApprover&&<button className="btn btn-primary btn-sm" onClick={()=>setRevenueModal(true)}><Plus size={12}/> Add Invoice</button>}
            </div>
            <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
              <table className="data-table">
                <thead><tr><th>Client</th><th>Campaign</th><th>Amount</th><th>Invoice Date</th><th>Payment Status</th><th>Payment Date</th><th>Description</th></tr></thead>
                <tbody>
                  {revenue.map(r=>(
                    <tr key={r.id}>
                      <td><div className="cell-primary">{r.clientName}</div></td>
                      <td style={{fontSize:'.82rem'}}>{r.campaignName}</td>
                      <td style={{fontWeight:700,color:'#10b981'}}>{formatINR(r.amount)}</td>
                      <td style={{fontSize:'.8rem'}}>{formatDate(r.invoiceDate)}</td>
                      <td><span className={`badge ${REV_STATUS_COLORS[r.paymentStatus]||'badge-gray'}`}>{r.paymentStatus}</span></td>
                      <td style={{fontSize:'.8rem'}}>{r.paymentDate?formatDate(r.paymentDate):'—'}</td>
                      <td style={{fontSize:'.78rem',color:'var(--text-3)',maxWidth:200,whiteSpace:'normal'}}>{r.description}</td>
                    </tr>
                  ))}
                  {!revenue.length&&<tr><td colSpan={7}><div className="empty-state"><TrendingUp size={40} color="var(--border-2)"/><div className="empty-state-title">No revenue entries yet</div></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2 — Campaign Budgets */}
        {tab===2&&(
          <div className="card">
            <div className="card-header">
              <div className="card-title">Campaign Budgets</div>
              {isApprover&&<button className="btn btn-primary btn-sm" onClick={()=>setBudgetModal(true)}><Plus size={12}/> New Budget</button>}
            </div>
            <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
              <table className="data-table">
                <thead><tr><th>Campaign</th><th>Client</th><th>Total Budget</th><th>Spent</th><th>Remaining</th><th>Utilization</th><th>Dept</th><th>Month</th><th>Status</th></tr></thead>
                <tbody>
                  {budgets.map(b=>{
                    const pct=budUtil(b);
                    const c=pct>85?'#ef4444':pct>60?'#f59e0b':'#10b981';
                    return (
                      <tr key={b.id}>
                        <td><div className="cell-primary">{b.campaignName}</div></td>
                        <td style={{fontSize:'.82rem'}}>{b.client}</td>
                        <td style={{fontWeight:700}}>{formatINR(b.totalBudget)}</td>
                        <td style={{fontWeight:600,color:'#ef4444'}}>{formatINR(b.spentAmount)}</td>
                        <td style={{fontWeight:600,color:'#10b981'}}>{formatINR(b.totalBudget-b.spentAmount)}</td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div className="progress-track" style={{width:70}}><div className="progress-fill" style={{width:`${Math.min(pct,100)}%`,background:c}}/></div>
                            <span style={{fontSize:'.78rem',fontWeight:700,color:c}}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{fontSize:'.78rem'}}>{b.dept}</td>
                        <td style={{fontSize:'.78rem',color:'var(--text-3)'}}>{b.month}</td>
                        <td><span className={`badge ${BUD_STATUS_COLORS[b.status]||'badge-gray'}`}>{b.status}</span></td>
                      </tr>
                    );
                  })}
                  {!budgets.length&&<tr><td colSpan={9}><div className="empty-state"><DollarSign size={40} color="var(--border-2)"/><div className="empty-state-title">No budgets yet</div></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3 — Reimbursements */}
        {tab===3&&(
          <div className="card">
            <div className="card-header">
              <div className="card-title">Reimbursements</div>
              <button className="btn btn-primary btn-sm" onClick={()=>setReimbModal(true)}><Plus size={12}/> Submit Claim</button>
            </div>
            <div className="table-wrap" style={{borderRadius:0,border:'none',borderTop:'1px solid var(--border)'}}>
              <table className="data-table">
                <thead><tr><th>Employee</th><th>Dept</th><th>Description</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {reimbs.filter(r=>isApprover||r.employeeId===session?.id).map(r=>(
                    <tr key={r.id}>
                      <td><div className="cell-primary">{r.employeeName}</div></td>
                      <td style={{fontSize:'.8rem'}}>{r.dept}</td>
                      <td style={{fontSize:'.8rem',maxWidth:200,whiteSpace:'normal'}}>{r.description}</td>
                      <td><span className="chip">{r.category}</span></td>
                      <td style={{fontWeight:700,color:'var(--primary)'}}>₹{r.amount?.toLocaleString('en-IN')}</td>
                      <td style={{fontSize:'.8rem'}}>{formatDate(r.date)}</td>
                      <td>
                        <span className={`badge ${REIMB_STATUS_COLORS[r.status]||'badge-gray'}`}>{r.status}</span>
                        {r.status==='rejected'&&r.rejectionReason&&<div style={{fontSize:'.68rem',color:'var(--danger)',marginTop:2}}>{r.rejectionReason}</div>}
                      </td>
                      <td>
                        <div className="row-actions" style={{opacity:1}}>
                          {isApprover&&r.status==='pending'&&(
                            <>
                              <button className="btn btn-success btn-sm" onClick={()=>approveReimb(r.id)}><Check size={12}/> Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={()=>openReject(r.id)}><X size={12}/> Reject</button>
                            </>
                          )}
                          {r.employeeId===session?.id&&r.status==='pending'&&(
                            <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>{if(confirm('Withdraw?')){ReimbDB.remove(r.id);refreshAll();}}}><X size={12}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!reimbs.filter(r=>isApprover||r.employeeId===session?.id).length&&(
                    <tr><td colSpan={8}><div className="empty-state"><Receipt size={40} color="var(--border-2)"/><div className="empty-state-title">No reimbursements</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4 — Invoice Generator */}
        {tab===4&&(
          <div className="grid-2">
            {/* Invoice Form (Left) */}
            <div className="card">
              <div className="card-header"><div className="card-title">Invoice Details</div></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input className="input" value={invForm.clientName} onChange={e=>setInvForm(f=>({...f,clientName:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <textarea className="textarea" value={invForm.address} onChange={e=>setInvForm(f=>({...f,address:e.target.value}))} style={{minHeight:50}}/>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Invoice #</label>
                    <input className="input" value={invForm.invoiceNo} onChange={e=>setInvForm(f=>({...f,invoiceNo:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Invoice Date</label>
                    <input className="input" type="date" value={invForm.invoiceDate} onChange={e=>setInvForm(f=>({...f,invoiceDate:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Due Date</label>
                    <input className="input" type="date" value={invForm.dueDate} onChange={e=>setInvForm(f=>({...f,dueDate:e.target.value}))}/></div>
                </div>
                
                {/* Items */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,marginTop:10}}>
                  <div style={{fontWeight:700,fontSize:'.82rem'}}>Billing Items</div>
                  <button className="btn btn-secondary btn-sm" onClick={()=>{
                    setInvForm(f=>({...f,items:[...f.items,{desc:'',qty:1,rate:0}]}))
                  }}><Plus size={11}/> Add Item</button>
                </div>
                {invForm.items.map((item,i)=>(
                  <div key={i} style={{background:'var(--bg)',borderRadius:'var(--r-sm)',padding:10,marginBottom:8,border:'1px solid var(--border)'}}>
                    <div className="form-group" style={{marginBottom:6}}>
                      <input className="input" value={item.desc} placeholder="Item Description" onChange={e=>{
                        const newItems=[...invForm.items]; newItems[i].desc=e.target.value; setInvForm(f=>({...f,items:newItems}));
                      }}/>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input className="input" type="number" placeholder="Qty" value={item.qty} style={{width:80}} onChange={e=>{
                        const newItems=[...invForm.items]; newItems[i].qty=parseInt(e.target.value)||0; setInvForm(f=>({...f,items:newItems}));
                      }}/>
                      <input className="input" type="number" placeholder="Rate (₹)" value={item.rate} style={{flex:1}} onChange={e=>{
                        const newItems=[...invForm.items]; newItems[i].rate=parseFloat(e.target.value)||0; setInvForm(f=>({...f,items:newItems}));
                      }}/>
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)',padding:0,width:30}} onClick={()=>{
                        setInvForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))
                      }}><X size={14}/></button>
                    </div>
                  </div>
                ))}

                <div className="form-row" style={{marginTop:12}}>
                  <div className="form-group"><label className="form-label">GST / Tax (%)</label>
                    <input className="input" type="number" value={invForm.taxRate} onChange={e=>setInvForm(f=>({...f,taxRate:parseInt(e.target.value)||0}))}/></div>
                  <div className="form-group"><label className="form-label">Discount (₹)</label>
                    <input className="input" type="number" value={invForm.discount} onChange={e=>setInvForm(f=>({...f,discount:parseFloat(e.target.value)||0}))}/></div>
                </div>
              </div>
            </div>

            {/* Invoice Preview (Right) */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontWeight:700,fontSize:'.85rem'}}>Live Invoice Preview</span>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={13}/> Print / Export PDF
                </button>
              </div>
              <div id="invoice-print-area" style={{
                background:'white',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',
                padding:28,boxShadow:'var(--shadow-sm)',color:'#1f2937',lineHeight:1.4
              }}>
                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'2px solid #3b82f6',paddingBottom:14,marginBottom:20}}>
                  <div>
                    <h2 style={{color:'#1e3a8a',fontSize:'1.4rem',fontWeight:900,letterSpacing:'-.02em'}}>VIGORLAUNCHPAD</h2>
                    <div style={{fontSize:'.72rem',color:'#6b7280'}}>Operations & BTL Activation Agency</div>
                    <div style={{fontSize:'.72rem',color:'#6b7280',marginTop:4}}>Baner Road, Pune, Maharashtra 411045</div>
                    <div style={{fontSize:'.72rem',color:'#6b7280'}}>GSTIN: 27AABCV8492K1Z9</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <h1 style={{fontSize:'1.5rem',fontWeight:800,color:'#9ca3af',letterSpacing:'.05em'}}>INVOICE</h1>
                    <div style={{fontSize:'.82rem',fontWeight:700,color:'#374151',marginTop:6}}>No: {invForm.invoiceNo}</div>
                  </div>
                </div>

                {/* Details */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24,fontSize:'.78rem'}}>
                  <div>
                    <div style={{fontWeight:700,color:'#4b5563',textTransform:'uppercase',fontSize:'.65rem',letterSpacing:'.05em',marginBottom:4}}>Billed To:</div>
                    <div style={{fontWeight:700,fontSize:'.85rem',color:'#111827'}}>{invForm.clientName}</div>
                    <div style={{color:'#4b5563',marginTop:3,whiteSpace:'pre-wrap',maxWidth:240}}>{invForm.address}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{marginBottom:4}}><span style={{color:'#6b7280'}}>Date:</span> <strong>{invForm.invoiceDate}</strong></div>
                    <div><span style={{color:'#6b7280'}}>Due Date:</span> <strong>{invForm.dueDate}</strong></div>
                  </div>
                </div>

                {/* Table */}
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem',marginBottom:20}}>
                  <thead>
                    <tr style={{borderBottom:'1.5px solid #d1d5db',background:'#f9fafb'}}>
                      <th style={{padding:8,textAlign:'left',fontWeight:700,color:'#374151'}}>Item Description</th>
                      <th style={{padding:8,textAlign:'center',width:60,fontWeight:700,color:'#374151'}}>Qty</th>
                      <th style={{padding:8,textAlign:'right',width:100,fontWeight:700,color:'#374151'}}>Rate</th>
                      <th style={{padding:8,textAlign:'right',width:110,fontWeight:700,color:'#374151'}}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invForm.items.map((item,idx)=>{
                      const amt=item.qty*item.rate;
                      return (
                        <tr key={idx} style={{borderBottom:'1px solid #e5e7eb'}}>
                          <td style={{padding:10,color:'#374151',fontWeight:500}}>{item.desc||'—'}</td>
                          <td style={{padding:10,textAlign:'center',color:'#4b5563'}}>{item.qty}</td>
                          <td style={{padding:10,textAlign:'right',color:'#4b5563'}}>₹{item.rate?.toLocaleString('en-IN')}</td>
                          <td style={{padding:10,textAlign:'right',fontWeight:600,color:'#111827'}}>₹{amt?.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Calculation */}
                <div style={{display:'flex',justifyContent:'flex-end',fontSize:'.78rem'}}>
                  <div style={{width:240}}>
                    {(() => {
                      const sub = invForm.items.reduce((s,x)=>s+(x.qty*x.rate),0);
                      const disc = invForm.discount || 0;
                      const tax = Math.round((sub - disc) * (invForm.taxRate / 100));
                      const total = sub - disc + tax;
                      return (
                        <>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{color:'#6b7280'}}>Subtotal:</span><strong>₹{sub.toLocaleString('en-IN')}</strong></div>
                          {disc>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',color:'var(--danger)'}}><span style={{color:'#6b7280'}}>Discount:</span><strong>-₹{disc.toLocaleString('en-IN')}</strong></div>}
                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{color:'#6b7280'}}>GST ({invForm.taxRate}%):</span><strong>₹{tax.toLocaleString('en-IN')}</strong></div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:'1.5px solid #d1d5db',fontSize:'.9rem',fontWeight:800,color:'#1e3a8a',marginTop:6}}>
                            <span>Total Due:</span><span>₹{total.toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer terms */}
                <div style={{marginTop:40,borderTop:'1px solid #e5e7eb',paddingTop:14,fontSize:'.68rem',color:'#9ca3af',textAlign:'center'}}>
                  Thank you for your business. Terms: Payment due within 15 days of invoice date. 
                  For bank transfer: HDFC Bank A/c 50200049281920 (IFSC HDFC0000104).
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUBMIT REIMB MODAL */}
      <Modal open={reimbModal} onClose={()=>setReimbModal(false)} title="Submit Reimbursement"
        footer={<><button className="btn btn-secondary" onClick={()=>setReimbModal(false)}>Cancel</button><button className="btn btn-primary" onClick={submitReimb}>Submit</button></>}>
        <div className="form-group"><label className="form-label">Description <span className="req">*</span></label>
          <input className="input" value={rForm.description} onChange={e=>setRForm(f=>({...f,description:e.target.value}))} placeholder="What was the expense for?"/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Amount (₹) <span className="req">*</span></label>
            <input className="input" type="number" value={rForm.amount} onChange={e=>setRForm(f=>({...f,amount:e.target.value}))} placeholder="e.g., 1500"/></div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="select" value={rForm.category} onChange={e=>setRForm(f=>({...f,category:e.target.value}))}>
              {REIMB_CATS.map(c=><option key={c}>{c}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Date <span className="req">*</span></label>
            <input className="input" type="date" value={rForm.date} onChange={e=>setRForm(f=>({...f,date:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">Receipt / Attachment URL</label>
          <input className="input" value={rForm.receiptUrl} onChange={e=>setRForm(f=>({...f,receiptUrl:e.target.value}))} placeholder="Drive link (optional)"/></div>
      </Modal>

      {/* ADD REVENUE MODAL */}
      <Modal open={revenueModal} onClose={()=>setRevenueModal(false)} title="Add Revenue Entry"
        footer={<><button className="btn btn-secondary" onClick={()=>setRevenueModal(false)}>Cancel</button><button className="btn btn-primary" onClick={addRevenue}>Add</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Client Name <span className="req">*</span></label>
            <input className="input" value={revForm.clientName} onChange={e=>setRevForm(f=>({...f,clientName:e.target.value}))} placeholder="e.g., Pepsi India"/></div>
          <div className="form-group"><label className="form-label">Campaign Name</label>
            <input className="input" value={revForm.campaignName} onChange={e=>setRevForm(f=>({...f,campaignName:e.target.value}))} placeholder="e.g., Campus Connect Q3"/></div>
          <div className="form-group"><label className="form-label">Amount (₹) <span className="req">*</span></label>
            <input className="input" type="number" value={revForm.amount} onChange={e=>setRevForm(f=>({...f,amount:e.target.value}))} placeholder="e.g., 500000"/></div>
          <div className="form-group"><label className="form-label">Invoice Date <span className="req">*</span></label>
            <input className="input" type="date" value={revForm.invoiceDate} onChange={e=>setRevForm(f=>({...f,invoiceDate:e.target.value}))}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Payment Status</label>
            <select className="select" value={revForm.paymentStatus} onChange={e=>setRevForm(f=>({...f,paymentStatus:e.target.value}))}>
              {['pending','paid','overdue'].map(s=><option key={s}>{s}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Payment Date</label>
            <input className="input" type="date" value={revForm.paymentDate} onChange={e=>setRevForm(f=>({...f,paymentDate:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">Description</label>
          <textarea className="textarea" style={{minHeight:60}} value={revForm.description} onChange={e=>setRevForm(f=>({...f,description:e.target.value}))} placeholder="Brief description of the campaign…"/></div>
      </Modal>

      {/* ADD BUDGET MODAL */}
      <Modal open={budgetModal} onClose={()=>setBudgetModal(false)} title="New Campaign Budget"
        footer={<><button className="btn btn-secondary" onClick={()=>setBudgetModal(false)}>Cancel</button><button className="btn btn-primary" onClick={addBudget}>Create Budget</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Campaign Name <span className="req">*</span></label>
            <input className="input" value={budForm.campaignName} onChange={e=>setBudForm(f=>({...f,campaignName:e.target.value}))} placeholder="e.g., Pepsi Campus Connect"/></div>
          <div className="form-group"><label className="form-label">Client</label>
            <input className="input" value={budForm.client} onChange={e=>setBudForm(f=>({...f,client:e.target.value}))} placeholder="Client name"/></div>
          <div className="form-group"><label className="form-label">Total Budget (₹) <span className="req">*</span></label>
            <input className="input" type="number" value={budForm.totalBudget} onChange={e=>setBudForm(f=>({...f,totalBudget:e.target.value}))} placeholder="e.g., 500000"/></div>
          <div className="form-group"><label className="form-label">Spent So Far (₹)</label>
            <input className="input" type="number" value={budForm.spentAmount} onChange={e=>setBudForm(f=>({...f,spentAmount:e.target.value}))} placeholder="0"/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Department</label>
            <select className="select" value={budForm.dept} onChange={e=>setBudForm(f=>({...f,dept:e.target.value}))}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Month</label>
            <input className="input" value={budForm.month} onChange={e=>setBudForm(f=>({...f,month:e.target.value}))} placeholder="e.g., June 2026"/></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="select" value={budForm.status} onChange={e=>setBudForm(f=>({...f,status:e.target.value}))}>
              {['Active','Completed','On Hold'].map(s=><option key={s}>{s}</option>)}
            </select></div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={rejectModal} onClose={()=>setRejectModal(false)} title="Reject Reimbursement" size="modal-sm"
        footer={<><button className="btn btn-secondary" onClick={()=>setRejectModal(false)}>Cancel</button><button className="btn btn-danger" onClick={confirmReject}>Reject</button></>}>
        <div className="form-group"><label className="form-label">Reason for Rejection</label>
          <textarea className="textarea" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Explain why this is being rejected…"/></div>
      </Modal>
    </div>
  );
}

function AlertIcon({ size, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
