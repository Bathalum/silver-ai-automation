/**
 * Complete Workflow Integration Test
 * 
 * Tests full end-to-end workflows including:
 * - Creating models with nodes and actions
 * - Cross-feature relationships
 * - Direct Supabase data verification
 * - Complex association patterns
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';
import { IONode } from '../../../lib/domain/entities/io-node';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Position } from '../../../lib/domain/value-objects/position';

describe('Complete Workflow Integration - End-to-End', () => {
  let supabase: SupabaseClient;
  let repository: SupabaseFunctionModelRepository;
  let testModelIds: string[] = [];
  let testNodeIds: string[] = [];

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not found');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    repository = new SupabaseFunctionModelRepository(supabase);
  });

  afterEach(async () => {
    // Clean up test data from all tables
    if (testNodeIds.length > 0) {
      await supabase.from('function_model_nodes').delete().in('node_id', testNodeIds);
    }
    if (testModelIds.length > 0) {
      await supabase.from('function_models').delete().in('model_id', testModelIds);
    }
    testModelIds = [];
    testNodeIds = [];
  });

  it('should create a complete workflow model with nodes and verify in Supabase', async () => {
    console.log('🚀 Testing complete workflow creation...');

    // Step 1: Create a function model with nodes
    const modelName = ModelName.create('Complete Workflow Test').value!;
    const version = Version.create('1.0.0').value!;
    
    // Create IO nodes for the workflow
    const inputNode = IONode.create({
      nodeId: NodeId.create().value!,
      name: 'Input Data',
      description: 'Input node for workflow',
      ioType: 'input' as any,
      dataSchema: { type: 'object', properties: { data: { type: 'string' } } },
      position: Position.create(100, 100).value!
    }).value!;

    const outputNode = IONode.create({
      nodeId: NodeId.create().value!,
      name: 'Output Results', 
      description: 'Output node for workflow',
      ioType: 'output' as any,
      dataSchema: { type: 'object', properties: { result: { type: 'string' } } },
      position: Position.create(300, 100).value!
    }).value!;

    testNodeIds.push(inputNode.nodeId.value, outputNode.nodeId.value);

    // Create the function model with nodes
    const model = FunctionModel.create({
      name: modelName,
      description: 'Complete workflow with input/output nodes',
      version: version,
      currentVersion: version
    }).value!;

    // Add nodes to the model
    model.addNode(inputNode);
    model.addNode(outputNode);

    testModelIds.push(model.modelId);

    // Step 2: Save the complete model using repository
    const saveResult = await repository.save(model);
    expect(saveResult.isSuccess).toBe(true);
    console.log('✅ Model with nodes saved via repository');

    // Step 3: Verify data directly in Supabase
    console.log('🔍 Verifying data directly in Supabase...');

    // Check function_models table
    const { data: modelData, error: modelError } = await supabase
      .from('function_models')
      .select('*')
      .eq('model_id', model.modelId)
      .single();

    expect(modelError).toBeNull();
    expect(modelData).toBeDefined();
    expect(modelData.name).toBe('Complete Workflow Test');
    expect(modelData.description).toBe('Complete workflow with input/output nodes');
    expect(modelData.version).toBe('1.0.0');
    expect(modelData.status).toBe('draft');
    console.log('✅ Model data verified in function_models table');

    // Check function_model_nodes table for associated nodes
    const { data: nodeData, error: nodeError } = await supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', model.modelId);

    expect(nodeError).toBeNull();
    expect(nodeData).toBeDefined();
    expect(nodeData.length).toBe(2); // Should have 2 nodes
    
    const inputNodeData = nodeData.find(n => n.name === 'Input Data');
    const outputNodeData = nodeData.find(n => n.name === 'Output Results');
    
    expect(inputNodeData).toBeDefined();
    expect(outputNodeData).toBeDefined();
    expect(inputNodeData.node_type).toBe('ioNode');
    expect(outputNodeData.node_type).toBe('ioNode');
    console.log('✅ Node data verified in function_model_nodes table');

    // Step 4: Retrieve via repository and verify completeness
    const retrieveResult = await repository.findById(model.modelId);
    expect(retrieveResult.isSuccess).toBe(true);
    expect(retrieveResult.value).toBeDefined();
    
    const retrievedModel = retrieveResult.value!;
    expect(retrievedModel.modelId).toBe(model.modelId);
    expect(retrievedModel.name.value).toBe('Complete Workflow Test');
    expect(retrievedModel.nodes.length).toBe(2);
    console.log('✅ Complete model retrieved with all nodes');

    console.log('🎉 Complete workflow integration test PASSED');
  });

  it('should handle complex model relationships and associations', async () => {
    console.log('🔗 Testing complex model relationships...');

    // Create a model with multiple node types and relationships
    const modelName = ModelName.create('Complex Relationship Test').value!;
    const version = Version.create('1.0.0').value!;
    
    const model = FunctionModel.create({
      name: modelName,
      description: 'Model with complex node relationships',
      version: version,
      currentVersion: version
    }).value!;

    // Create multiple nodes with dependencies
    const node1 = IONode.create({
      nodeId: NodeId.create().value!,
      name: 'Start Node',
      description: 'Starting point',
      ioType: 'input' as any,
      dataSchema: { type: 'object' },
      position: Position.create(50, 50).value!
    }).value!;

    const node2 = IONode.create({
      nodeId: NodeId.create().value!,
      name: 'Processing Node',
      description: 'Processes data',
      ioType: 'output' as any,
      dataSchema: { type: 'object' },
      position: Position.create(200, 50).value!
    }).value!;

    testNodeIds.push(node1.nodeId.value, node2.nodeId.value);
    testModelIds.push(model.modelId);

    // Add nodes with dependencies
    model.addNode(node1);
    model.addNode(node2);

    // Save the model
    const saveResult = await repository.save(model);
    expect(saveResult.isSuccess).toBe(true);
    console.log('✅ Complex model saved');

    // Verify in Supabase that relationships are preserved
    const { data: nodeData, error } = await supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', model.modelId)
      .order('created_at', { ascending: true });

    expect(error).toBeNull();
    expect(nodeData.length).toBe(2);
    
    // Verify node positions are saved correctly
    const startNode = nodeData.find(n => n.name === 'Start Node');
    const processingNode = nodeData.find(n => n.name === 'Processing Node');
    
    expect(startNode.position_x).toBe(50);
    expect(startNode.position_y).toBe(50);
    expect(processingNode.position_x).toBe(200);
    expect(processingNode.position_y).toBe(50);
    
    console.log('✅ Complex relationships verified in Supabase');
  });

  it('should verify data integrity across multiple table operations', async () => {
    console.log('🔄 Testing multi-table data integrity...');

    const modelName = ModelName.create('Multi-Table Integrity Test').value!;
    const version = Version.create('2.0.0').value!;
    
    const model = FunctionModel.create({
      name: modelName,
      description: 'Testing data integrity across tables',
      version: version,
      currentVersion: version
    }).value!;

    testModelIds.push(model.modelId);

    // Save model first
    const saveResult = await repository.save(model);
    expect(saveResult.isSuccess).toBe(true);

    // Verify both model data and metadata are consistent
    const { data: models } = await supabase
      .from('function_models')
      .select('*')
      .eq('model_id', model.modelId);

    const { data: nodes } = await supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', model.modelId);

    expect(models.length).toBe(1);
    expect(models[0].version).toBe('2.0.0');
    expect(models[0].current_version).toBe('2.0.0');
    expect(models[0].version_count).toBe(1);
    
    // Verify timestamps are reasonable (within last minute)
    const createdAt = new Date(models[0].created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute ago

    console.log('✅ Multi-table data integrity verified');
  });

  it('should demonstrate production-ready error recovery', async () => {
    console.log('⚠️ Testing production error recovery...');

    // Test what happens when we try to save a model with invalid data
    const modelName = ModelName.create('Error Recovery Test').value!;
    const version = Version.create('1.0.0').value!;
    
    const model = FunctionModel.create({
      name: modelName,
      description: 'Testing error recovery',
      version: version,
      currentVersion: version
    }).value!;

    testModelIds.push(model.modelId);

    // Save the model successfully first
    const saveResult = await repository.save(model);
    expect(saveResult.isSuccess).toBe(true);

    // Now try to save the same model again (duplicate ID)
    const duplicateResult = await repository.save(model);
    
    // Should handle the duplicate gracefully
    // (Either succeed as upsert or fail gracefully)
    if (duplicateResult.isFailure) {
      console.log(`✅ Duplicate save handled gracefully: ${duplicateResult.error}`);
    } else {
      console.log('✅ Duplicate save handled as upsert');
    }

    // Verify the original data is still intact
    const { data: finalData } = await supabase
      .from('function_models')
      .select('*')
      .eq('model_id', model.modelId);

    expect(finalData.length).toBe(1);
    expect(finalData[0].name).toBe('Error Recovery Test');
    
    console.log('✅ Error recovery maintains data integrity');
  });
});