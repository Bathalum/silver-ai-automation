// Simulate EXACT test scenario
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Import the repository class (we'll simulate it for now)
async function testExactScenario() {
  console.log('Testing EXACT test scenario...');

  const supabase = createClient(
    'https://eociyasapoevremiompw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2l5YXNhcG9ldnJlbWlvbXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjUxMzcsImV4cCI6MjA2Nzk0MTEzN30.FnUOxJezlscerzU-Zo_jC8BFJvLalW9Wlex_CrUP0ag'
  );

  // EXACT test model creation
  const testModelId = crypto.randomUUID();
  console.log('Generated testModelId:', testModelId);

  // Create model exactly like test does
  const testModel = {
    modelId: testModelId,
    name: { value: 'Integration Test Model' },
    description: 'Real integration test model', 
    version: { value: '1.0.0' },
    status: 'draft',
    currentVersion: { value: '1.0.0' },
    versionCount: 1,
    metadata: { createdBy: 'integration-test' },
    permissions: { owner: 'integration-test' },
    aiAgentConfig: undefined,
    // These are added by FunctionModel.create
    nodes: new Map(),
    actionNodes: new Map(),
    createdAt: new Date(),
    updatedAt: new Date(), 
    lastSavedAt: new Date(),
    // These should be undefined
    deletedAt: undefined,
    deletedBy: undefined
  };

  console.log('Model properties before save:');
  console.log('- modelId:', testModel.modelId);
  console.log('- deletedAt:', testModel.deletedAt);
  console.log('- deletedBy:', testModel.deletedBy);

  // Test save operation (using upsert like the repository)
  const modelRow = {
    model_id: testModel.modelId,
    name: testModel.name.value,
    description: testModel.description || null,
    version: testModel.version.value,
    status: testModel.status,
    current_version: testModel.currentVersion.value,
    version_count: testModel.versionCount || 1,
    metadata: testModel.metadata || {},
    permissions: testModel.permissions || {},
    ai_agent_config: testModel.aiAgentConfig || null,
    created_at: testModel.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: testModel.updatedAt?.toISOString() || new Date().toISOString(),
    last_saved_at: testModel.lastSavedAt?.toISOString() || new Date().toISOString(),
    deleted_at: testModel.deletedAt?.toISOString() || null,
    deleted_by: testModel.deletedBy || null
  };

  console.log('\nSaving with row data:');
  console.log('- model_id:', modelRow.model_id);
  console.log('- deleted_at:', modelRow.deleted_at);

  const { data: saveData, error: saveError } = await supabase
    .from('function_models')
    .upsert(modelRow);

  if (saveError) {
    console.error('❌ Save error:', saveError);
    return;
  }
  console.log('✅ Save successful');

  // Wait like test might
  await new Promise(resolve => setTimeout(resolve, 10));

  // Find by exact same ID used for save
  console.log('\nFinding by modelId:', testModel.modelId);
  const { data: findData, error: findError } = await supabase
    .from('function_models')
    .select('*')
    .eq('model_id', testModel.modelId)
    .single();

  if (findError) {
    console.error('❌ Find error:', findError);
  } else {
    console.log('✅ Found model:');
    console.log('- model_id:', findData.model_id);
    console.log('- name:', findData.name);
    console.log('- deleted_at:', findData.deleted_at);
    console.log('- deleted_by:', findData.deleted_by);

    if (findData.deleted_at) {
      console.log('❌ MODEL IS UNEXPECTEDLY SOFT-DELETED!');
      console.log('Deleted timestamp:', findData.deleted_at);
    } else {
      console.log('✅ Model is active (not soft-deleted)');
    }
  }

  // Cleanup
  await supabase
    .from('function_models') 
    .delete()
    .eq('model_id', testModelId);
}

testExactScenario().catch(console.error);