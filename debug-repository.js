// Quick debug script to test repository save/findById cycle
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

async function testRepository() {
  console.log('Creating Supabase client...');
  const supabase = createClient(
    'https://eociyasapoevremiompw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2l5YXNhcG9ldnJlbWlvbXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjUxMzcsImV4cCI6MjA2Nzk0MTEzN30.FnUOxJezlscerzU-Zo_jC8BFJvLalW9Wlex_CrUP0ag'
  );

  console.log('Testing raw Supabase operations...');
  
  const testModelId = crypto.randomUUID();
  const modelData = {
    model_id: testModelId,
    name: 'Debug Test Model',
    description: 'Testing save/find cycle',
    version: '1.0.0',
    status: 'draft',
    current_version: '1.0.0',
    version_count: 1,
    metadata: { test: true },
    permissions: { test: true },
    ai_agent_config: null
  };

  // Test save
  console.log('Saving model...', modelData);
  const { data: saveData, error: saveError } = await supabase
    .from('function_models')
    .upsert(modelData);
  
  if (saveError) {
    console.error('Save error:', saveError);
    return;
  }
  console.log('Save result:', saveData);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 100));

  // Test findById
  console.log('Finding model by ID...');
  const { data: findData, error: findError } = await supabase
    .from('function_models')
    .select('*')
    .eq('model_id', testModelId)
    .single();

  if (findError) {
    console.error('Find error:', findError);
    return;
  }
  
  console.log('Find result:', findData);

  if (findData) {
    console.log('✅ SUCCESS: Model found after save');
    console.log('Model name:', findData.name);
    console.log('Created at:', findData.created_at);
    console.log('Deleted at:', findData.deleted_at);
  } else {
    console.log('❌ FAILURE: Model not found');
  }

  // Cleanup
  console.log('Cleaning up...');
  await supabase
    .from('function_models')
    .delete()
    .eq('model_id', testModelId);
}

testRepository().catch(console.error);