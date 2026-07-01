// ============================================================
// DATA LAYER — Supabase primary + localStorage cache
// ============================================================
import { supabase } from './supabase';

export const ZONES = {
  north: { key: 'north', label: 'North Zone', color: '#3b82f6', states: ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh', 'J&K', 'Uttarakhand', 'Uttar Pradesh'] },
  south: { key: 'south', label: 'South Zone', color: '#10b981', states: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'] },
  east: { key: 'east', label: 'East Zone', color: '#f59e0b', states: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam', 'Manipur', 'Meghalaya'] },
  west: { key: 'west', label: 'West Zone', color: '#8b5cf6', states: ['Maharashtra', 'Gujarat', 'Goa', 'Rajasthan'] },
  central: { key: 'central', label: 'Central Zone', color: '#ef4444', states: ['Madhya Pradesh', 'Chhattisgarh'] },
};

export const DEMO_USERS = [
  { id: 'u1', name: 'Nilesh Patil', email: 'nilesh@vigorlaunchpad.com', password: 'Vigor@2026', role: 'admin', dept: 'Management', zone: null, exportAccess: true },
  { id: 'u2', name: 'Pravash', email: 'pravash@vigorlaunchpad.com', password: 'Vigor@2026', role: 'founder', dept: 'Management', zone: null, exportAccess: true },
];

export const ROLE_LABELS = {
  admin: 'Administrator', founder: 'Founder', hr: 'HR Manager', finance: 'Finance Team',
  vigorspace: 'VigorSpace Team', influencer: 'Influencer Team', operations: 'Operations Manager', pm: 'Project Manager',
};

export const ROLE_NAV = {
  admin:      ['dashboard', 'leads', 'clients', 'campaigns', 'events', 'vigorspace', 'colleges', 'vendors', 'college_influencers', 'influencers', 'tasks', 'finance', 'reports', 'users', 'leaves', 'okrs', 'timeline', 'sops', 'attendance'],
  founder:    ['dashboard', 'leads', 'clients', 'campaigns', 'events', 'vigorspace', 'colleges', 'vendors', 'college_influencers', 'influencers', 'tasks', 'finance', 'reports', 'users', 'leaves', 'okrs', 'timeline', 'sops', 'attendance'],
  hr:         ['dashboard', 'users', 'finance', 'tasks', 'reports', 'leaves', 'okrs', 'sops', 'attendance'],
  finance:    ['dashboard', 'clients', 'finance', 'reports', 'leaves', 'okrs', 'timeline', 'sops', 'attendance'],
  vigorspace: ['dashboard', 'vigorspace', 'colleges', 'vendors', 'college_influencers', 'tasks', 'events', 'leaves', 'okrs', 'sops', 'attendance'],
  influencer: ['dashboard', 'influencers', 'campaigns', 'tasks', 'leaves', 'okrs', 'sops', 'attendance'],
  operations: ['dashboard', 'leads', 'clients', 'campaigns', 'events', 'vigorspace', 'colleges', 'vendors', 'college_influencers', 'influencers', 'tasks', 'finance', 'reports', 'users', 'leaves', 'okrs', 'timeline', 'sops', 'attendance'],
  pm:         ['dashboard', 'leads', 'clients', 'campaigns', 'events', 'vigorspace', 'colleges', 'vendors', 'college_influencers', 'influencers', 'tasks', 'finance', 'reports', 'users', 'leaves', 'okrs', 'timeline', 'sops', 'attendance'],
};

// ── Lead / Campaign / Event Constants ─────────────────────────
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];
export const LEAD_STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal_sent: 'Proposal Sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost'
};
export const LEAD_STATUS_COLORS = {
  new: 'badge-blue', contacted: 'badge-purple', qualified: 'badge-teal',
  proposal_sent: 'badge-orange', negotiation: 'badge-yellow', won: 'badge-green', lost: 'badge-red'
};
export const LEAD_SOURCES = ['Website', 'Referral', 'Cold Outreach', 'Inbound Email', 'Event', 'Social Media', 'LinkedIn', 'Other'];
export const BRAND_TYPES = ['D2C', 'FMCG', 'Tech', 'Fashion', 'F&B', 'Healthcare', 'Finance', 'Beauty', 'Lifestyle', 'Gaming', 'Education', 'Other'];
export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const CAMPAIGN_STATUSES = ['planning', 'active', 'in_progress', 'content_approval', 'live', 'completed', 'cancelled'];
export const CAMPAIGN_STATUS_LABELS = {
  planning: 'Planning', active: 'Active', in_progress: 'In Progress',
  content_approval: 'Content Approval', live: 'Live', completed: 'Completed', cancelled: 'Cancelled'
};
export const CAMPAIGN_STATUS_COLORS = {
  planning: 'badge-gray', active: 'badge-blue', in_progress: 'badge-orange',
  content_approval: 'badge-purple', live: 'badge-green', completed: 'badge-teal', cancelled: 'badge-red'
};
export const CAMPAIGN_TYPES = ['Brand Activation', 'Influencer Marketing', 'Digital Campaign', 'Performance Marketing', 'PR', 'Content Creation', 'Event Marketing', 'Other'];

export const EVENT_STATUSES = ['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'];
export const EVENT_STATUS_LABELS = {
  planning: 'Planning', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled'
};
export const EVENT_STATUS_COLORS = {
  planning: 'badge-gray', confirmed: 'badge-blue', in_progress: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red'
};
export const EVENT_TYPES = ['College Activation', 'Corporate Event', 'Brand Launch', 'Product Sampling', 'BTL Activation', 'Exhibition', 'Workshop', 'Other'];

export const CONTACT_TYPES = [
  'Student Committee', 'Student Council', 'HOD', 'Principal', 'Vice Principal',
  'NCC Officer', 'E-Cell', 'Placement Cell', 'Cultural Committee', 'Technical Committee',
  'State Contact', 'Fest Coordinator', 'Other',
];

// ============================================================
// Supabase async store factory
// ============================================================
function camelToSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const sk = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    // Convert empty strings to null to prevent invalid syntax casting errors in Postgres
    result[sk] = v === '' ? null : v;
  }
  return result;
}

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[ck] = v;
  }
  return result;
}

export function makeSupabaseStore(tableName, cacheKey) {
  // --- Sync cache (localStorage) for instant reads ---
  const cacheGet = () => JSON.parse(localStorage.getItem(cacheKey) || '[]');
  const cacheSet = (arr) => localStorage.setItem(cacheKey, JSON.stringify(arr));

  // Sync API (reads from cache — always instant for UI)
  const all = () => cacheGet();
  const get = (id) => cacheGet().find(r => r.id === id);
  const save = (arr) => cacheSet(arr);

  // Async API (writes to Supabase + updates cache)
  const syncFromDB = async () => {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) { console.error(`[${tableName}] fetch error`, error); return cacheGet(); }
    const rows = (data || []).map(snakeToCamel);
    cacheSet(rows);
    return rows;
  };

  const add = async (item) => {
    const payload = camelToSnake(item);
    const { data, error } = await supabase.from(tableName).insert(payload).select().single();
    if (error) {
      console.error(`[${tableName}] insert error`, error);
      // fallback: save to cache only
      const arr = cacheGet(); arr.unshift(item); cacheSet(arr);
      return item;
    }
    const row = snakeToCamel(data);
    const arr = cacheGet(); arr.unshift(row); cacheSet(arr);
    return row;
  };

  const update = async (id, patch) => {
    const payload = camelToSnake({ ...patch, updatedAt: new Date().toISOString() });
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
    if (error) {
      console.error(`[${tableName}] update error`, error);
      // fallback: update cache only
      const arr = cacheGet();
      const i = arr.findIndex(r => r.id === id);
      if (i > -1) { arr[i] = { ...arr[i], ...patch, updatedAt: new Date().toISOString() }; cacheSet(arr); return arr[i]; }
      return null;
    }
    const row = snakeToCamel(data);
    const arr = cacheGet();
    const i = arr.findIndex(r => r.id === id);
    if (i > -1) arr[i] = row; else arr.unshift(row);
    cacheSet(arr);
  };

  const bulkAdd = async (items) => {
    if (!Array.isArray(items) || !items.length) return [];
    const payloads = items.map(camelToSnake);
    const { data, error } = await supabase.from(tableName).insert(payloads).select();
    if (error) {
      console.error(`[${tableName}] bulk insert error`, error);
      const arr = cacheGet();
      items.forEach(item => arr.unshift(item));
      cacheSet(arr);
      return items;
    }
    const rows = (data || []).map(snakeToCamel);
    const arr = cacheGet();
    rows.forEach(row => {
      // Prevent duplicates in cache
      if (!arr.some(r => r.id === row.id)) {
        arr.unshift(row);
      }
    });
    cacheSet(arr);
    return rows;
  };

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) console.error(`[${tableName}] delete error`, error);
    cacheSet(cacheGet().filter(r => r.id !== id));
  };

  return { all, get, save, add, bulkAdd, update, remove, syncFromDB };
}

// Legacy sync makeStore (kept for helpers that still need it)
export function makeStore(key) {
  const all = () => JSON.parse(localStorage.getItem(key) || '[]');
  const save = (arr) => localStorage.setItem(key, JSON.stringify(arr));
  const get = (id) => all().find(r => r.id === id);
  const add = (item) => { const arr = all(); arr.unshift(item); save(arr); return item; };
  const update = (id, patch) => {
    const arr = all();
    const i = arr.findIndex(r => r.id === id);
    if (i > -1) { arr[i] = { ...arr[i], ...patch, updatedAt: new Date().toISOString() }; save(arr); return arr[i]; }
    return null;
  };
  const remove = (id) => save(all().filter(r => r.id !== id));
  return { all, save, get, add, update, remove };
}

// ── DB Stores ────────────────────────────────────────────────
export const CollegeDB = makeSupabaseStore('vlcrm_colleges', 'vlcrm2_colleges');
export const InfluencerDB = makeSupabaseStore('vlcrm_influencers', 'vlcrm2_influencers');
export const VendorDB = makeSupabaseStore('vlcrm_vendors', 'vlcrm2_vendors');
export const TaskDB = makeSupabaseStore('vlcrm_tasks', 'vlcrm2_tasks');
export const ReimbDB = makeSupabaseStore('vlcrm_reimbursements', 'vlcrm2_reimbursements');
export const RevenueDB = makeSupabaseStore('vlcrm_revenue', 'vlcrm2_revenue');
export const BudgetDB = makeSupabaseStore('vlcrm_budgets', 'vlcrm2_budgets');
export const LeadDB = makeSupabaseStore('vlcrm_leads', 'vlcrm2_leads');
export const ClientDB = makeSupabaseStore('vlcrm_clients', 'vlcrm2_clients');
export const CampaignDB = makeSupabaseStore('vlcrm_campaigns', 'vlcrm2_campaigns');
export const EventDB = makeSupabaseStore('vlcrm_events', 'vlcrm2_events');
export const ShortlistDB = makeSupabaseStore('vlcrm_campaign_shortlists', 'vlcrm2_shortlists');
export const AnnouncementDB = makeSupabaseStore('vlcrm_announcements', 'vlcrm2_announcements');
export const LeaveDB = makeSupabaseStore('vlcrm_leaves', 'vlcrm2_leaves');
export const PayslipDB = makeSupabaseStore('vlcrm_payslips', 'vlcrm2_payslips');
export const OKRDB = makeSupabaseStore('vlcrm_okrs', 'vlcrm2_okrs');
export const SopDB = makeSupabaseStore('vlcrm_sops', 'vlcrm2_sops');
export const CommentDB = makeSupabaseStore('vlcrm_comments', 'vlcrm2_comments');
export const AttachmentDB = makeSupabaseStore('vlcrm_attachments', 'vlcrm2_attachments');
export const AttendanceDB = makeSupabaseStore('vlcrm_attendance', 'vlcrm2_attendance');

// ── Supabase Storage upload helper ───────────────────────────
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { console.error('[storage] upload error', error); return null; }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData?.publicUrl || null;
}

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error('[storage] delete error', error);
}


// ── User Management ──────────────────────────────────────────
export function getAllUsers() { const s = localStorage.getItem('vlcrm2_users'); return s ? JSON.parse(s) : []; }
export function saveUsers(u) { localStorage.setItem('vlcrm2_users', JSON.stringify(u)); }
export function getUserById(id) { return getAllUsers().find(u => u.id === id); }
export function getUserName(id) {
  if (!id) return 'Unassigned';
  const teams = ['VigorSpace Team', 'Influencer Team', 'Digital Team', 'Operations Team', 'Finance Team', 'HR Team'];
  if (teams.includes(id)) return id;
  return getUserById(id)?.name || id;
}

// Supabase user sync
export async function syncUsersFromDB() {
  const { data, error } = await supabase.from('vlcrm_users').select('*');
  if (error) { console.error('[users] fetch error', error); return getAllUsers(); }
  const users = (data || []).map(u => {
    const perms = u.permissions || {};
    const payroll = perms.payroll_info || {};
    // Support multi-zone: DB may have zones[] array or legacy zone string
    const zonesRaw = u.zones || perms.zones;
    const zones = Array.isArray(zonesRaw) && zonesRaw.length
      ? zonesRaw
      : (u.zone ? [u.zone] : []);
    return {
      id: u.id, name: u.name, email: u.email, password: u.password,
      role: u.role, dept: u.dept,
      zone: u.zone,   // keep legacy field for backward compat
      zones,          // new multi-zone array
      exportAccess: u.export_access,
      // Always merge ROLE_NAV defaults so new pages (leaves etc) are never blocked
      allowedNav: u.allowed_nav && u.allowed_nav.length
        ? [...new Set([...u.allowed_nav, ...(ROLE_NAV[u.role] || [])])]
        : (ROLE_NAV[u.role] || null),
      permissions: perms,
      // Personal / payroll fields (check columns first, then fallback JSON object)
      pan: u.pan || payroll.pan || '',
      aadhar: u.aadhar || payroll.aadhar || '',
      mobile: u.mobile || payroll.mobile || '',
      dateJoining: u.date_joining || payroll.dateJoining || '',
      bankName: u.bank_name || payroll.bankName || '',
      bankAccount: u.bank_account || payroll.bankAccount || '',
      ifsc: u.ifsc || payroll.ifsc || '',
    };
  });
  if (users.length) saveUsers(users);
  return users;
}

/**
 * Returns all effective zones for a user:
 *   - Their profile zones[]
 *   - Plus any task zones they are assigned to (task-based access grant)
 */
export function getUserZones(user) {
  if (!user) return [];
  if (['admin', 'founder', 'operations', 'pm'].includes(user.role)) {
    // Full national access roles see all zones
    return Object.keys(ZONES);
  }
  const profileZones = Array.isArray(user.zones) && user.zones.length
    ? user.zones
    : (user.zone ? [user.zone] : []);
  // Collect task-assigned zones for this user
  const tasks = TaskDB.all();
  const taskZones = tasks
    .filter(t => {
      const assigned = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
      return assigned.includes(user.id) && t.zone;
    })
    .map(t => t.zone);
  return [...new Set([...profileZones, ...taskZones])];
}

export async function upsertUserToDB(user) {
  const payroll_info = {
    pan: user.pan || null,
    aadhar: user.aadhar || null,
    mobile: user.mobile || null,
    dateJoining: user.dateJoining || null,
    bankName: user.bankName || null,
    bankAccount: user.bankAccount || null,
    ifsc: user.ifsc || null,
  };

  // Store zones in permissions JSON as fallback (in case zones column doesn't exist in DB yet)
  const zonesArr = Array.isArray(user.zones) && user.zones.length
    ? user.zones
    : (user.zone ? [user.zone] : []);

  const perms = {
    ...(user.permissions || {}),
    payroll_info,
    zones: zonesArr, // store multi-zone in permissions JSON as fallback
  };

  const basePayload = {
    id: user.id, name: user.name, email: user.email,
    password: user.password, role: user.role, dept: user.dept,
    zone: zonesArr[0] || null, // keep legacy zone as first zone for backward compat
    export_access: user.exportAccess,
    allowed_nav: user.allowedNav || null,
    permissions: perms,
  };

  const fullPayload = {
    ...basePayload,
    zones: zonesArr,  // write to zones[] column if it exists
    pan: user.pan || null,
    aadhar: user.aadhar || null,
    mobile: user.mobile || null,
    date_joining: user.dateJoining || null,
    bank_name: user.bankName || null,
    bank_account: user.bankAccount || null,
    ifsc: user.ifsc || null,
  };

  // Try to write using new columns first
  const { error } = await supabase.from('vlcrm_users').upsert(fullPayload, { onConflict: 'id' });
  if (error) {
    console.warn('[upsertUserToDB] failed with columns, falling back to JSON storage...', error.message);
    // Fallback: save without zones column, storing zones inside permissions JSON instead
    const { error: fallbackError } = await supabase.from('vlcrm_users').upsert(basePayload, { onConflict: 'id' });
    if (fallbackError) {
      console.error('[upsertUserToDB] fallback failed as well:', fallbackError.message);
    }
  }
}

export async function deleteUserFromDB(id) {
  await supabase.from('vlcrm_users').delete().eq('id', id);
}

// ── Activity Log ─────────────────────────────────────────────
export async function logActivity(action, entityType, entityName, extra = '', userId = null, userName = null) {
  const session = getSession();
  const entry = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    userId: userId || session?.id,
    userName: userName || session?.name || 'System',
    action, entityType, entityName, extra,
    timestamp: new Date().toISOString(),
  };

  // Update local cache immediately
  const log = JSON.parse(localStorage.getItem('vlcrm2_activity') || '[]');
  log.unshift(entry);
  localStorage.setItem('vlcrm2_activity', JSON.stringify(log.slice(0, 600)));

  // Persist to Supabase async (fire-and-forget)
  supabase.from('vlcrm_activity_log').insert({
    id: entry.id,
    user_id: entry.userId,
    user_name: entry.userName,
    action: entry.action,
    entity_type: entry.entityType,
    entity_name: entry.entityName,
    extra: entry.extra,
    timestamp: entry.timestamp,
  }).then(({ error }) => {
    if (error) console.warn('[activity_log] insert error', error);
  });
}

export function getActivityLog(limit = 100) {
  return JSON.parse(localStorage.getItem('vlcrm2_activity') || '[]').slice(0, limit);
}

export async function syncActivityFromDB(limit = 100) {
  const { data, error } = await supabase
    .from('vlcrm_activity_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) { console.error('[activity_log] fetch error', error); return getActivityLog(limit); }
  const rows = (data || []).map(r => ({
    id: r.id, userId: r.user_id, userName: r.user_name,
    action: r.action, entityType: r.entity_type, entityName: r.entity_name,
    extra: r.extra, timestamp: r.timestamp,
  }));
  localStorage.setItem('vlcrm2_activity', JSON.stringify(rows));
  return rows;
}

// ── Session ───────────────────────────────────────────────────
export function getSession() { const s = localStorage.getItem('vlcrm2_session'); return s ? JSON.parse(s) : null; }
export function setSession(u) { localStorage.setItem('vlcrm2_session', JSON.stringify(u)); }
export function clearSession() { localStorage.removeItem('vlcrm2_session'); }
export function canExport() { return !!getSession()?.exportAccess; }
export function hasNav(k) { const s = getSession(); return (ROLE_NAV[s?.role] || []).includes(k); }

// Daily Auto Attendance Logging Helper
export async function recordAttendanceForToday(user) {
  if (!user || !user.id) return;
  try {
    await AttendanceDB.syncFromDB();
    const todayStr = new Date().toISOString().split('T')[0];
    const list = AttendanceDB.all();
    const alreadyCheckedIn = list.some(a => a.userId === user.id && a.date === todayStr);

    if (!alreadyCheckedIn) {
      const now = new Date();
      const checkInTime = now.toTimeString().split(' ')[0];
      // Late threshold standard is 10:00 AM
      const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 0);
      const status = isLate ? 'late' : 'present';

      const entry = {
        id: genId('att'),
        userId: user.id,
        userName: user.name,
        date: todayStr,
        checkIn: checkInTime,
        checkOut: null,
        status: status,
        type: 'auto',
        location: 'office',
        note: isLate ? 'Auto logged late arrival (after 10:00 AM)' : 'Auto logged present'
      };

      await AttendanceDB.add(entry);
      logActivity('Checked In', 'Attendance', user.name, `at ${checkInTime} (${status})`);
    }
  } catch (err) {
    console.error('[recordAttendanceForToday] failed to log daily attendance:', err);
  }
}

// ── Utils ─────────────────────────────────────────────────────
export function genId(p = 'id') { return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }
export function formatDate(d) {
  if (!d) return '—';
  return new Date(typeof d === 'string' ? d : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(typeof d === 'string' ? d : d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
export function isOverdue(d) { return d && new Date(d) < new Date(); }
export function formatINR(n) {
  if (!n && n !== 0) return '—';
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n;
}
export function formatFollowers(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return '' + n;
}
export function getInfluencerTier(f) {
  if (f >= 600000) return 'Mega';
  if (f >= 100000) return 'Macro';
  if (f >= 35000) return 'Mid Micro';
  if (f >= 10000) return 'Micro';
  return 'Nano';
}
export function searchFilter(arr, q, fields) {
  if (!q) return arr;
  const ql = q.toLowerCase();
  return arr.filter(r => fields.some(f => String(r[f] || '').toLowerCase().includes(ql)));
}
export function paginate(arr, page, size = 20) {
  const s = (page - 1) * size;
  return { data: arr.slice(s, s + size), total: arr.length, pages: Math.ceil(arr.length / size) };
}
export function getZoneBadgeClass(zone) {
  const map = { north: 'badge-zone-north', south: 'badge-zone-south', east: 'badge-zone-east', west: 'badge-zone-west', central: 'badge-zone-central' };
  return map[zone] || 'badge-gray';
}
export function getZoneColor(zone) { return ZONES[zone]?.color || '#9ca3af'; }

// CSV export helper
export function exportToCSV(rows, filename, colMap) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(colMap);
  const header = Object.values(colMap).join(',');
  const body = rows.map(r =>
    keys.map(k => {
      const v = r[k] ?? '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Finance helpers ───────────────────────────────────────────
export function getFinanceSummary() {
  const reimbs = ReimbDB.all();
  const revenue = RevenueDB.all();
  const budgets = BudgetDB.all();
  const totalRevenue = revenue.filter(r => r.status === 'paid' || r.paymentStatus === 'paid').reduce((s, r) => s + (r.amount || 0), 0);
  const pendingInvoice = revenue.filter(r => r.status === 'pending' || r.paymentStatus === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = reimbs.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
  const totalBudgeted = budgets.reduce((s, b) => s + (b.totalBudget || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
  const deptSpend = {};
  reimbs.filter(r => r.status === 'approved').forEach(r => { deptSpend[r.dept] = (deptSpend[r.dept] || 0) + (r.amount || 0); });
  return {
    totalRevenue, pendingInvoice,
    totalExpense, netPL: totalRevenue - totalExpense,
    totalBudgeted, totalSpent, budgetRemaining: totalBudgeted - totalSpent,
    pendingReimbs: reimbs.filter(r => r.status === 'pending').length,
    deptSpend,
  };
}

// ── Dashboard Stats ───────────────────────────────────────────
export function getDashboardStats() {
  const colleges = CollegeDB.all();
  const leads = LeadDB.all();
  const clients = ClientDB.all();
  const campaigns = CampaignDB.all();
  const events = EventDB.all();
  const zoneStats = {};
  Object.keys(ZONES).forEach(z => {
    zoneStats[z] = {
      colleges: colleges.filter(c => c.zone === z).length,
      vendors: VendorDB.all().filter(v => v.zone === z).length,
    };
  });
  return {
    colleges: colleges.length,
    influencers: InfluencerDB.all().length,
    vendors: VendorDB.all().length,
    tasks: TaskDB.all().length,
    tasksDone: TaskDB.all().filter(t => t.status === 'done').length,
    overdueTasks: TaskDB.all().filter(t => t.deadline && isOverdue(t.deadline) && t.status !== 'done').length,
    users: getAllUsers().length,
    zoneStats,
    finance: getFinanceSummary(),
    // New modules
    totalLeads: leads.length,
    activeLeads: leads.filter(l => !['won', 'lost'].includes(l.status)).length,
    wonLeads: leads.filter(l => l.status === 'won').length,
    lostLeads: leads.filter(l => l.status === 'lost').length,
    leadsByStatus: LEAD_STATUSES.reduce((acc, s) => { acc[s] = leads.filter(l => l.status === s).length; return acc; }, {}),
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => !['completed', 'cancelled'].includes(c.status)).length,
    totalEvents: events.length,
    upcomingEvents: events.filter(e => e.startDate && new Date(e.startDate) > new Date()).length,
    totalDealValue: leads.reduce((s, l) => s + (l.dealValue || 0), 0),
    pipelineValue: leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + (l.dealValue || 0), 0),
  };
}

// ── Seed Demo Data into Supabase ──────────────────────────────
// NOTE: Gemini API key is now server-side only (Vercel env var)
// Use src/lib/gemini.js for AI calls from the frontend

const DEMO_COLLEGES = [];
const DEMO_INFLUENCERS = [];
const DEMO_VENDORS = [];
const DEMO_TASKS = [];
const DEMO_REIMBS = [];
const DEMO_REVENUE = [];
const DEMO_BUDGETS = [];

async function seedTableIfEmpty(store, demoRows, tableName) {
  // Check Supabase first
  const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  if (count > 0) {
    // Table has data — sync to cache
    await store.syncFromDB();
    return;
  }
  // Table empty — insert demo data
  const payload = demoRows.map(r => camelToSnake(r));
  const { error } = await supabase.from(tableName).insert(payload);
  if (error) {
    console.warn(`[seed] ${tableName} insert error, using localStorage fallback`, error);
    store.save(demoRows);
  } else {
    store.save(demoRows);
  }
}

export async function initDemoData() {
  // Seed local users if empty
  const local = getAllUsers();
  if (!local || local.length === 0) {
    saveUsers(DEMO_USERS);
  }

  // Always seed/upsert Supabase users to keep credentials and roles in sync
  try {
    for (const u of DEMO_USERS) {
      const payload = {
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        dept: u.dept,
        zone: u.zone,
        export_access: u.exportAccess,
        allowed_nav: null,
      };
      await supabase.from('vlcrm_users').upsert(payload, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[initDemoData] Failed to upsert users into Supabase:', err);
  }
  await syncUsersFromDB();

  await Promise.all([
    seedTableIfEmpty(CollegeDB, DEMO_COLLEGES, 'vlcrm_colleges'),
    seedTableIfEmpty(InfluencerDB, DEMO_INFLUENCERS, 'vlcrm_influencers'),
    seedTableIfEmpty(VendorDB, DEMO_VENDORS, 'vlcrm_vendors'),
    seedTableIfEmpty(TaskDB, DEMO_TASKS, 'vlcrm_tasks'),
    seedTableIfEmpty(ReimbDB, DEMO_REIMBS, 'vlcrm_reimbursements'),
    seedTableIfEmpty(RevenueDB, DEMO_REVENUE, 'vlcrm_revenue'),
    seedTableIfEmpty(BudgetDB, DEMO_BUDGETS, 'vlcrm_budgets'),
    seedTableIfEmpty(AnnouncementDB, [], 'vlcrm_announcements'),
    seedTableIfEmpty(LeaveDB, [], 'vlcrm_leaves'),
    seedTableIfEmpty(PayslipDB, [], 'vlcrm_payslips'),
    seedTableIfEmpty(OKRDB, [
      {
        id: 'okr_demo_1',
        quarter: 'Q2 2026',
        title: 'Establish VigorLaunchpad as the #1 Campus Activation Partner',
        owner: 'Founder',
        status: 'on_track',
        progress: 42,
        createdAt: new Date().toISOString(),
        keyResults: [
          { id: 'kr_1_1', text: 'Onboard 50 colleges across 5 zones', target: 50, current: 21, unit: 'colleges' },
          { id: 'kr_1_2', text: 'Run 10 successful brand activation campaigns', target: 10, current: 4, unit: 'campaigns' },
          { id: 'kr_1_3', text: 'Achieve ₹20L in confirmed revenue', target: 2000000, current: 840000, unit: '₹' },
        ]
      },
      {
        id: 'okr_demo_2',
        quarter: 'Q2 2026',
        title: 'Build a High-Performance Team & Culture',
        owner: 'Founder',
        status: 'at_risk',
        progress: 28,
        createdAt: new Date().toISOString(),
        keyResults: [
          { id: 'kr_2_1', text: 'Hire 5 new team members across departments', target: 5, current: 2, unit: 'hires' },
          { id: 'kr_2_2', text: 'Achieve team NPS score above 8/10', target: 8, current: 6.5, unit: '/10' },
          { id: 'kr_2_3', text: 'Complete onboarding for all new joiners within 2 weeks', target: 100, current: 40, unit: '%' },
        ]
      }
    ], 'vlcrm_okrs'),
    seedTableIfEmpty(SopDB, [
      {
        id: 'sop_1',
        title: 'College Activation Execution Protocol',
        category: 'Operations',
        createdBy: 'Operations Manager',
        createdAt: new Date().toISOString(),
        content: `### 📋 Overview
Standard operating procedure for setting up, executing, and dismantling brand activation zones in college campuses.

### 1. Pre-Event Preparation (T-7 to T-1 Days)
- Confirm permission letters from College Principal / Dean.
- Check power outlet accessibility and layout constraints.
- Arrange for standees, backdrops, and promotional materials.
- Assign local campus ambassadors for crowd routing.

### 2. D-Day Setup (6:00 AM - 9:00 AM)
- Verify that the canopy/booth structure is set up securely.
- Connect power lines, audio speakers, and screens. Ensure cables are taped down to prevent tripping.
- Lay out giveaways, brochures, and dynamic registration QR codes.
- Do a trial run of registration forms and data sync.

### 3. Execution Phase (9:00 AM - 5:00 PM)
- Maintain high energy levels. Play upbeat, background music (comply with college noise limits).
- Campus ambassadors must engage passing students, directing them to scan the QR code.
- Run interactive contests (e.g., spin the wheel, fast quizzes) to gather leads.
- Keep the booth clean. Dispose of plastic cups, paper waste instantly.

### 4. Wind-up & Reporting (5:00 PM onwards)
- Safely dismantle booth components and store in transport boxes.
- Log total registrations and download lead data.
- Upload activation photos to the Campaigns directory.`,
        acknowledgedBy: []
      },
      {
        id: 'sop_2',
        title: 'Campaign Content Approval Workflow',
        category: 'Campaigns',
        createdBy: 'Project Manager',
        createdAt: new Date().toISOString(),
        content: `### 📋 Overview
Procedure for verifying influencer content drafts before going live to ensure brand alignment and contract compliance.

### Steps:
1. **Draft Collection**: Instruct all shortlist influencers to upload their draft video/reel/post directly to the campaign portal at least 48 hours prior to live schedule.
2. **Quality Inspection**: Check for:
   - Pronunciation of Brand Name (must be clear).
   - Visibility of main product/logo.
   - Mention of target promo codes/discounts.
   - Absence of competitor references.
3. **Approval Status**:
   - Update status in Campaign shortlist as Approved or Feedback Needed.
   - Send explicit, actionable revision points if changes are required.
4. **Final Posting**: Only allow publishing post written confirmation.`,
        acknowledgedBy: []
      }
    ], 'vlcrm_sops'),
    seedTableIfEmpty(ClientDB, [], 'vlcrm_clients'),
    seedTableIfEmpty(LeadDB, [], 'vlcrm_leads'),
    seedTableIfEmpty(CampaignDB, [], 'vlcrm_campaigns'),
    seedTableIfEmpty(EventDB, [], 'vlcrm_events'),
    seedTableIfEmpty(ShortlistDB, [], 'vlcrm_campaign_shortlists'),
    seedTableIfEmpty(AttendanceDB, (() => {
      const demoAttendance = [];
      const usersToSeed = [
        { id: 'u1', name: 'Nilesh Patil' },
        { id: 'u2', name: 'Pravash' },
      ];
      const today = new Date();
      let dayOffset = 0;
      let seededDays = 0;
      while (seededDays < 15) {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOffset);
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          usersToSeed.forEach(u => {
            const randHour = 9;
            const randMin = Math.floor(Math.random() * 50);
            const isLate = randHour === 10 || (randHour === 9 && randMin >= 30);
            const status = isLate ? 'late' : 'present';
            demoAttendance.push({
              id: `att_demo_${u.id}_${seededDays}`,
              userId: u.id,
              userName: u.name,
              date: dateStr,
              checkIn: `${randHour.padStart ? randHour.toString().padStart(2, '0') : '09'}:${randMin.toString().padStart(2, '0')}:00`,
              checkOut: '18:30:00',
              status: status,
              type: 'auto',
              location: Math.random() > 0.85 ? 'field' : 'office',
              note: status === 'late' ? 'Slightly delayed in transit' : 'Regular check-in'
            });
          });
          seededDays++;
        }
        dayOffset++;
      }
      return demoAttendance;
    })(), 'vlcrm_attendance'),
  ]);
}

// Granular permissions helper
export function hasPermission(user, entity, action) {
  if (!user) return false;
  // Admin and founder roles have permanent, full access to everything
  if (['admin', 'founder'].includes(user.role)) return true;

  // Check if explicit permissions object is defined
  const userPerms = user.permissions?.[entity];
  if (userPerms) {
    return !!userPerms[action];
  }

  // Fallback to role-based default permissions if granular is not explicitly set
  // This ensures backwards compatibility and default behavior for existing users
  if (action === 'export') {
    return !!user.exportAccess;
  }

  // View is generally allowed unless restricted. Delete is restricted.
  if (action === 'delete') {
    return ['operations', 'hr', 'finance'].includes(user.role);
  }

  if (action === 'edit' || action === 'create') {
    if (entity === 'finance') return ['finance', 'operations'].includes(user.role);
    if (entity === 'users') return ['hr', 'admin'].includes(user.role);
    return true; // Default allow create/edit for operations/pms/etc.
  }

  return true;
}

