import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('[Supabase Diagnostics] URL length:', supabaseUrl ? supabaseUrl.length : 0, 'URL preview:', supabaseUrl ? supabaseUrl.substring(0, 15) : 'none');
console.log('[Supabase Diagnostics] Key length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing env vars — check .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
