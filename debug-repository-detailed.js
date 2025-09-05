// Debug the repository implementation specifically
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Simulate the test model creation process 
async function testFunctionModelCreation() {
  console.log('Starting detailed repository debug...');

  const supabase = createClient(
    'https://eociyasapoevremiompw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2l5YXNhcG9ldnJlbWlvbXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjUxMzcsImV4cCI6MjA2Nzk0MTEzN30.FnUOxJezlscerzU-Zo_jC8BFJvLalW9Wlex_CrUP0ag'
  );

  // Simulate the exact model creation from test
  const testModelId = crypto.randomUUID();
  console.log('Test Model ID:', testModelId);

  // This mimics the domain object properties from the test
  const testModel = {
    modelId: testModelId,
    name: { value: 'Integration Test Model' }, // ModelName value object
    description: 'Real integration test model',
    version: { value: '1.0.0' }, // Version value object
    status: 'draft',
    currentVersion: { value: '1.0.0' },
    versionCount: 1,
    metadata: { createdBy: 'integration-test' },
    permissions: { owner: 'integration-test' },
    aiAgentConfig: undefined,
    // Check if these timestamp fields are causing issues
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSavedAt: new Date(),
    deletedAt: undefined, // This should be undefined/null
    deletedBy: undefined,
    nodes: new Map(), // Empty nodes collection
    actionNodes: new Map() // Empty action nodes collection
  };

  console.log('Test model object:');
  console.log('- modelId:', testModel.modelId);
  console.log('- name:', testModel.name);
  console.log('- deletedAt:', testModel.deletedAt);
  console.log('- deletedBy:', testModel.deletedBy);

  // Simulate the fromDomain conversion
  const getName = () => {
    try {
      if (testModel.name && typeof testModel.name === 'object' && 'value' in testModel.name) {
        return testModel.name.value;
      }
      return testModel.name?.toString() || 'Untitled Model';
    } catch (error) {
      return 'Untitled Model';
    }
  };

  const getVersion = (versionProp) => {
    try {
      if (versionProp && typeof versionProp === 'object' && 'value' in versionProp) {
        return versionProp.value;
      }
      return versionProp?.toString() || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  };

  const modelRow = {
    model_id: testModel.modelId,
    name: getName(),
    description: testModel.description || null,
    version: getVersion(testModel.version),
    status: testModel.status,
    current_version: getVersion(testModel.currentVersion),
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

  console.log('\nConverted model row for database:');
  console.log('- model_id:', modelRow.model_id);
  console.log('- name:', modelRow.name);
  console.log('- deleted_at:', modelRow.deleted_at);
  console.log('- deleted_by:', modelRow.deleted_by);

  // Save to database
  console.log('\nSaving model to database...');
  const { data: saveData, error: saveError } = await supabase
    .from('function_models')
    .upsert(modelRow);

  if (saveError) {
    console.error('Save error:', saveError);
    return;
  }
  console.log('Save result:', saveData);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 100));

  // Test findById
  console.log('\nFinding model by ID...');
  const { data: findData, error: findError } = await supabase
    .from('function_models')
    .select('*')
    .eq('model_id', testModelId)
    .single();

  if (findError) {
    console.error('Find error:', findError);
  } else {
    console.log('Find result:');
    console.log('- model_id:', findData.model_id);
    console.log('- name:', findData.name);  
    console.log('- deleted_at:', findData.deleted_at);
    console.log('- deleted_by:', findData.deleted_by);

    if (findData.deleted_at) {
      console.log('❌ MODEL IS SOFT-DELETED!');
    } else {
      console.log('✅ Model is active');
    }
  }

  // Cleanup
  console.log('\nCleaning up...');
  await supabase
    .from('function_models')
    .delete()
    .eq('model_id', testModelId);
}

testFunctionModelCreation().catch(console.error);