const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zgcxdbpjrclfjnnxucfc.supabase.co', 'sb_publishable_Z4q44arE-QIxxy7QqjGqEg_qHl3L1JX');

async function run() {
  const testPayload = {
    id: 'test_task_fk_check',
    title: 'Test Task Title FK',
    description: 'Test Description',
    dept: 'VigorSpace',
    assigned_to: 'VigorSpace Team', // Team name instead of user ID
    priority: 'medium',
    status: 'todo',
    deadline: null,
    tags: ['BTL'],
    subtasks: [],
    assigned_by: 'u1',
    created_at: new Date().toISOString()
  };
  
  console.log('Inserting task assigned to a Team name...');
  const { data: insData, error: insError } = await supabase.from('vlcrm_tasks').insert(testPayload).select();
  if (insError) {
    console.error('Insert error details:', insError);
  } else {
    console.log('Insert success:', insData);
    await supabase.from('vlcrm_tasks').delete().eq('id', 'test_task_fk_check');
  }
}
run();
