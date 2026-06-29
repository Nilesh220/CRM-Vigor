const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zgcxdbpjrclfjnnxucfc.supabase.co', 'sb_publishable_Z4q44arE-QIxxy7QqjGqEg_qHl3L1JX');

async function run() {
  const testPayload = {
    id: 'test_client_id_888',
    brand_name: 'Test Brand Name 2',
    company_name: 'Test Company 2',
    poc_name: 'POC Name',
    poc_email: 'poc@example.com',
    poc_phone: '1234567890',
    category: 'Test Category',
    brand_type: 'D2C',
    gst_number: '123456789',
    billing_address: 'Address',
    contract_start: '', // empty string like the form submits when empty
    contract_end: '',   // empty string like the form submits when empty
    contract_value: 10000,
    status: 'active',
    notes: 'Some notes',
  };
  
  console.log('Inserting test client with empty strings for dates...');
  const { data: insData, error: insError } = await supabase.from('vlcrm_clients').insert(testPayload).select();
  if (insError) {
    console.error('Insert error details:', insError);
  } else {
    console.log('Insert success:', insData);
    await supabase.from('vlcrm_clients').delete().eq('id', 'test_client_id_888');
  }
}
run();
