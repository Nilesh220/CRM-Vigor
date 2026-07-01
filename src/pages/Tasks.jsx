import { useState, useRef, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import MultiAssignSelect from '../components/ui/MultiAssignSelect';
import { useToast, useSession } from '../contexts/AppContext';
import { TaskDB, getAllUsers, genId, logActivity, getUserName, formatDate, isOverdue, ROLE_LABELS, ZONES } from '../lib/data';
import { Plus, Calendar, AlertCircle, CheckSquare, Edit2, Trash2, GripVertical, Search, X, ListTodo } from 'lucide-react';

const STATUSES   = ['todo','inprogress','review','done'];
const STATUS_LABELS = { todo:'To Do', inprogress:'In Progress', review:'In Review', done:'Done' };
const STATUS_COLORS = { todo:'#94a3b8', inprogress:'#3b82f6', review:'#f59e0b', done:'#10b981' };
const PRIO_COLORS   = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
const PRIO_LABELS   = { high:'High', medium:'Medium', low:'Low' };
const DEPTS = ['VigorSpace','Influencer Team','Finance','HR','Operations','Project Mgmt','Management'];

function emptyTask() {
  return { title:'', description:'', dept:'VigorSpace', assignedTo:[], zone:'', priority:'medium', status:'todo', deadline:'', tags:'', subtasks: [] };
}

export default function Tasks() {
  const toast = useToast();
  const session = useSession();
  const users = getAllUsers();
  const [tasks, setTasks] = useState(()=>TaskDB.all());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyTask());
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState(null);
  const [subtasks, setSubtasks] = useState([]);

  useEffect(() => {
    TaskDB.syncFromDB().then(rows => setTasks(rows));
  }, []);

  const refresh = () => setTasks(TaskDB.all());

  const filtered = tasks.filter(t => {
    if (filterDept && t.dept !== filterDept) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = [t.title, t.description||''].join(' ').toLowerCase().includes(q) ||
        (t.tags||[]).some(tag => tag.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  function openAdd(defaultStatus='todo') {
    setEditId(null);
    setForm({...emptyTask(), status:defaultStatus});
    setSubtasks([]);
    setModal(true);
  }
  function openEdit(t) {
    setEditId(t.id);
    // Normalize assignedTo to always be array on load
    const assignedTo = Array.isArray(t.assignedTo)
      ? t.assignedTo
      : (t.assignedTo ? [t.assignedTo] : []);
    setForm({...emptyTask(),...t, assignedTo, tags:Array.isArray(t.tags)?t.tags.join(', '):t.tags||''});
    setSubtasks(JSON.parse(JSON.stringify(t.subtasks||[])));
    setModal(true);
  }
  async function save() {
    if (!form.title.trim()) { toast('Task title required.','warning'); return; }
    const tags = form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
    const assignedTo = Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : []);
    const payload = {...form, tags, subtasks, assignedTo};
    if (editId) {
      await TaskDB.update(editId, payload);
      logActivity('Updated','Task',form.title);
      toast('Task updated!','success');
    } else {
      payload.id=genId('tsk'); payload.assignedBy=session?.id; payload.createdAt=new Date().toISOString();
      await TaskDB.add(payload);
      const names = assignedTo.map(id => getUserName(id)).join(', ');
      logActivity('Created','Task',form.title,`Assigned to ${names || 'Nobody'}`);
      toast('Task created!','success');
    }
    setModal(false); refresh();
  }
  async function del(id) {
    const t=TaskDB.get(id);
    if (!confirm(`Delete "${t?.title}"?`)) return;
    await TaskDB.remove(id); logActivity('Deleted','Task',t?.title||id);
    toast('Deleted.','success'); refresh();
  }

  // Drag & Drop
  function onDragStart(e, id) { setDragId(id); e.dataTransfer.effectAllowed='move'; }
  async function onDrop(e, newStatus) {
    e.preventDefault();
    if (!dragId) return;
    const t=TaskDB.get(dragId);
    await TaskDB.update(dragId, {status:newStatus});
    logActivity('Moved','Task',t?.title||dragId,`→ ${STATUS_LABELS[newStatus]}`);
    toast('Task moved!','success',1800);
    setDragId(null); refresh();
  }
  function onDragOver(e) { e.preventDefault(); }

  const kpis = [
    {label:'To Do',value:tasks.filter(t=>t.status==='todo').length,c:'#94a3b8',bg:'#f8fafc'},
    {label:'In Progress',value:tasks.filter(t=>t.status==='inprogress').length,c:'#3b82f6',bg:'#eff6ff'},
    {label:'In Review',value:tasks.filter(t=>t.status==='review').length,c:'#f59e0b',bg:'#fffbeb'},
    {label:'Done',value:tasks.filter(t=>t.status==='done').length,c:'#10b981',bg:'#ecfdf5'},
    {label:'Overdue',value:tasks.filter(t=>t.deadline&&isOverdue(t.deadline)&&t.status!=='done').length,c:'#ef4444',bg:'#fef2f2'},
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Task Board</div>
          <div className="page-breadcrumb">VigorLaunchpad CRM &rsaquo; Tasks</div>
        </div>
        <div className="page-header-right" style={{ gap: 8 }}>
          <div className="search-wrap" style={{ minWidth: 200, padding: '5px 9px' }}>
            <Search size={13}/>
            <input placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)} style={{ fontSize: '.78rem' }}/>
            {search && <button onClick={()=>setSearch('')}><X size={11}/></button>}
          </div>
          <select className="select" style={{ width: 'auto', padding: '5px 30px 5px 10px' }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="select" style={{ width: 'auto', padding: '5px 30px 5px 10px' }} value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {DEPTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={()=>openAdd()}><Plus size={14}/> New Task</button>
        </div>
      </div>
      <div className="page-body">
        <div className="kpi-grid" style={{gridTemplateColumns:'repeat(5,1fr)',marginBottom:18}}>
          {kpis.map(k=>(
            <div key={k.label} className="kpi-card" style={{'--kpi-accent':k.c}}>
              <div className="kpi-icon" style={{background:k.bg}}><CheckSquare size={16} color={k.c}/></div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="kanban">
          {STATUSES.map(s=>{
            const cols = filtered.filter(t=>t.status===s);
            return (
              <div key={s} className="kanban-col" onDragOver={onDragOver} onDrop={e=>onDrop(e,s)}>
                <div className="kanban-col-head">
                  <div className="kanban-col-label">
                    <div className="col-indicator" style={{background:STATUS_COLORS[s]}}/>
                    {STATUS_LABELS[s]}
                    <span className="col-count">{cols.length}</span>
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{width:24,height:24}} onClick={()=>openAdd(s)}><Plus size={12}/></button>
                </div>
                <div className="kanban-body">
                  {cols.map(t=>{
                    const overdue = isOverdue(t.deadline) && t.status!=='done';
                    const assigneeIds = Array.isArray(t.assignedTo)
                      ? t.assignedTo
                      : (t.assignedTo ? [t.assignedTo] : []);
                    const allUsers = getAllUsers();
                    const tags = Array.isArray(t.tags) ? t.tags : [];
                    return (
                      <div key={t.id} className="task-card" style={{'--tc':PRIO_COLORS[t.priority]||'var(--primary)'}}
                        draggable onDragStart={e=>onDragStart(e,t.id)} onClick={()=>openEdit(t)}>
                        <div className="task-card-title">{t.title}</div>
                        <div className="task-meta">
                          <span style={{fontSize:'.68rem',fontWeight:700,color:PRIO_COLORS[t.priority]}}>{PRIO_LABELS[t.priority]}</span>
                          {t.dept&&<span className="chip" style={{fontSize:'.65rem',padding:'1px 6px'}}>{t.dept}</span>}
                          {t.zone&&<span className="chip" style={{fontSize:'.65rem',padding:'1px 6px',background:'var(--primary-hover)',color:'var(--primary)'}}>{ZONES[t.zone]?.label||t.zone}</span>}
                        </div>
                        {tags.length>0&&(
                          <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:7}}>
                            {tags.slice(0,3).map(tag=>(
                              <span key={tag} style={{fontSize:'.62rem',background:'var(--primary-hover)',color:'var(--primary)',padding:'1px 6px',borderRadius:4}}>{tag}</span>
                            ))}
                          </div>
                        )}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.68rem', color: 'var(--text-3)', marginBottom: 7 }}>
                            <ListTodo size={11} />
                            <span>
                              {t.subtasks.filter(st => st.done).length}/{t.subtasks.length} subtasks
                            </span>
                          </div>
                        )}
                        <div className="task-footer">
                          {/* Multi-assignee avatars */}
                          <div style={{display:'flex',alignItems:'center'}}>
                            {assigneeIds.slice(0,3).map((id,idx) => {
                              const u = allUsers.find(u=>u.id===id);
                              const name = u ? u.name : (id||'?');
                              const ini = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
                              return (
                                <div key={id} className="avatar avatar-sm"
                                  style={{background:PRIO_COLORS[t.priority]||'var(--primary)',marginLeft:idx>0?-6:0,border:'2px solid var(--surface)',zIndex:3-idx}}
                                  title={name}>{ini}</div>
                              );
                            })}
                            {assigneeIds.length>3&&(
                              <div className="avatar avatar-sm" style={{background:'var(--border)',color:'var(--text-2)',fontSize:'.6rem',marginLeft:-6,border:'2px solid var(--surface)',fontWeight:700}}>
                                +{assigneeIds.length-3}
                              </div>
                            )}
                            {assigneeIds.length===0&&(
                              <div className="avatar avatar-sm" style={{background:'var(--border)',color:'var(--text-3)'}} title="Unassigned">?</div>
                            )}
                          </div>
                          {t.deadline&&(
                            <div className={`task-due ${overdue?'overdue':''}`}>
                              {overdue&&<AlertCircle size={10}/>}
                              {!overdue&&<Calendar size={10}/>}
                              {formatDate(t.deadline)}
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  })}
                  {!cols.length&&(
                    <div style={{textAlign:'center',padding:'24px 12px',color:'var(--text-3)',fontSize:'.75rem',border:'2px dashed var(--border)',borderRadius:'var(--r-sm)',margin:'4px'}}>
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Task':'New Task'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            {editId&&<button className="btn btn-danger btn-sm" onClick={()=>{del(editId);setModal(false);}}>Delete</button>}
            <button className="btn btn-primary" onClick={save}>{editId?'Update':'Create'} Task</button>
          </>
        }>
        <div className="form-group"><label className="form-label">Task Title <span className="req">*</span></label>
          <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What needs to be done?"/></div>
        <div className="form-group"><label className="form-label">Description</label>
          <textarea className="textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="More details…"/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Department</label>
            <select className="select" value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Zone</label>
            <select className="select" value={form.zone||''} onChange={e=>setForm(f=>({...f,zone:e.target.value}))}>
              <option value="">All Zones / National</option>
              {Object.entries(ZONES).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select></div>
          <div className="form-group"><label className="form-label">Priority</label>
            <select className="select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select></div>
        </div>
        <div className="form-group"><label className="form-label">Assign To</label>
          <MultiAssignSelect
            value={Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : [])}
            onChange={val => setForm(f => ({...f, assignedTo: val}))}
            users={users}
          />
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Status</label>
            <select className="select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Deadline</label>
            <input className="input" type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Tags <span style={{fontWeight:400,color:'var(--text-3)'}}>(comma separated)</span></label>
            <input className="input" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="e.g., BTL, Pune, Influencer"/></div>
        </div>
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="form-label" style={{ margin: 0, fontWeight: 700 }}>Task Checklist / Subtasks</span>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setSubtasks(prev => [...prev, { text: '', done: false }]);
            }}><Plus size={11}/> Add Item</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {subtasks.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={st.done}
                  onChange={e => {
                    const next = [...subtasks];
                    next[i].done = e.target.checked;
                    setSubtasks(next);
                  }}
                  style={{ width: 14, height: 14, cursor: 'pointer' }}
                />
                <input
                  className="input"
                  value={st.text}
                  placeholder="Checklist item description..."
                  onChange={e => {
                    const next = [...subtasks];
                    next[i].text = e.target.value;
                    setSubtasks(next);
                  }}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '.8rem' }}
                />
                <button className="btn btn-ghost btn-sm" style={{ padding: 0, width: 24, height: 24, color: 'var(--danger)' }} onClick={() => {
                  setSubtasks(prev => prev.filter((_, idx) => idx !== i));
                }}><X size={12}/></button>
              </div>
            ))}
            {!subtasks.length && (
              <div style={{ fontSize: '.76rem', color: 'var(--text-3)', fontStyle: 'italic', padding: '4px 0' }}>
                No checklist items added yet.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
