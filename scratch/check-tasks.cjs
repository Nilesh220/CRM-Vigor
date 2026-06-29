const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zgcxdbpjrclfjnnxucfc.supabase.co', 'sb_publishable_Z4q44arE-QIxxy7QqjGqEg_qHl3L1JX');

async function run() {
  console.log('Querying vlcrm_tasks...');
  const { data, error } = await supabase.from('vlcrm_tasks').select('*');
  console.log('Error:', error);
  console.log('Data count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('First record keys:', Object.keys(data[0]));
    console.log('First record details:', data[0]);
  }
}
run();
