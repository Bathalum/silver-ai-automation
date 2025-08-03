// Simple test script to verify version loading
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testVersionLoading() {
  try {
    console.log('Testing version loading...')
    
    // Get all function models
    const { data: models, error: modelsError } = await supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (modelsError) {
      console.error('Error fetching models:', modelsError)
      return
    }
    
    if (models.length === 0) {
      console.log('No models found')
      return
    }
    
    const modelId = models[0].model_id
    console.log('Testing with model ID:', modelId)
    
    // Get version history
    const { data: versions, error: versionsError } = await supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('version_number', { ascending: false })
    
    if (versionsError) {
      console.error('Error fetching versions:', versionsError)
      return
    }
    
    console.log('Found versions:', versions.length)
    
    if (versions.length === 0) {
      console.log('No versions found')
      return
    }
    
    // Test loading the first version
    const version = versions[0]
    console.log('Testing version:', version.version_number)
    
    const snapshot = version.version_data
    console.log('Snapshot keys:', Object.keys(snapshot))
    console.log('Has nodes:', !!snapshot.nodes)
    console.log('Has edges:', !!snapshot.edges)
    console.log('Has viewportData:', !!snapshot.viewportData)
    console.log('Has name:', !!snapshot.name)
    console.log('Has description:', !!snapshot.description)
    
    // Reconstruct model
    const reconstructedModel = {
      modelId: snapshot.modelId,
      name: snapshot.name || models[0].name || 'Unknown Model',
      description: snapshot.description || models[0].description || '',
      version: snapshot.version,
      status: snapshot.status || models[0].status || 'draft',
      nodes: snapshot.nodes || [],
      edges: snapshot.edges || [],
      viewportData: snapshot.viewportData || { x: 0, y: 0, zoom: 1 },
      processType: snapshot.processType || models[0].process_type,
      complexityLevel: snapshot.complexityLevel || models[0].complexity_level,
      estimatedDuration: snapshot.estimatedDuration || models[0].estimated_duration,
      tags: snapshot.tags || models[0].tags || [],
      metadata: snapshot.metadata || models[0].metadata || {},
      permissions: snapshot.permissions || models[0].permissions || {},
      relationships: snapshot.relationships || [],
      versionHistory: [],
      currentVersion: snapshot.version,
      createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : new Date(models[0].created_at),
      updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt) : new Date(models[0].updated_at),
      lastSavedAt: snapshot.lastSavedAt ? new Date(snapshot.lastSavedAt) : new Date(models[0].last_saved_at)
    }
    
    console.log('Reconstructed model:')
    console.log('- Name:', reconstructedModel.name)
    console.log('- Version:', reconstructedModel.version)
    console.log('- Nodes count:', reconstructedModel.nodes.length)
    console.log('- Edges count:', reconstructedModel.edges.length)
    console.log('- Viewport:', reconstructedModel.viewportData)
    
    console.log('Version loading test completed successfully!')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testVersionLoading() 