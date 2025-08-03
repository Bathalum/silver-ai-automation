// Function Model Persistence Use Cases
// This file implements the business logic for Function Model persistence operations

import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import type { 
  FunctionModel, 
  SaveOptions, 
  LoadOptions, 
  FunctionModelFilters 
} from '../../domain/entities/function-model-types'
import type { 
  CrossFeatureLink 
} from '../../domain/entities/cross-feature-link-types'
import type { 
  VersionEntry, 
  ChangeDescription, 
  FunctionModelSnapshot 
} from '../../domain/entities/version-control-types'
import { 
  createFunctionModel, 
  isValidFunctionModel 
} from '../../domain/entities/function-model-types'
import { 
  createCrossFeatureLink, 
  isValidCrossFeatureLink 
} from '../../domain/entities/cross-feature-link-types'
import { 
  createVersionEntry, 
  createChangeDescription, 
  createFunctionModelSnapshot,
  incrementVersion,
  isValidVersion 
} from '../../domain/entities/version-control-types'

// Create repository instance
const functionModelRepository = new FunctionModelRepository()

// Save Function Model use case
export const saveFunctionModel = async (
  model: FunctionModel,
  options: SaveOptions = {}
): Promise<FunctionModel> => {
  console.log('saveFunctionModel called with:', { model, options })
  
  // Validate model data
  if (!isValidFunctionModel(model)) {
    console.error('Invalid Function Model data:', model)
    throw new Error('Invalid Function Model data')
  }

  // Update metadata
  const updatedModel = {
    ...model,
    metadata: {
      ...model.metadata,
      lastSavedAt: new Date()
    },
    lastSavedAt: new Date()
  }

  console.log('Updated model:', updatedModel)

  // Increment version if auto-versioning is enabled
  if (options.autoVersion) {
    // Get the latest version number to avoid conflicts
    const versionHistory = await getVersionHistory(model.modelId)
    const latestVersion = versionHistory.length > 0 ? versionHistory[0].version : model.version
    
    updatedModel.version = incrementVersion(latestVersion, false)
    updatedModel.currentVersion = updatedModel.version
    console.log('Version incremented to:', updatedModel.version)
  }

  // Save to repository
  console.log('Calling repository update...')
  const savedModel = await functionModelRepository.update(model.modelId, updatedModel)
  console.log('Model saved successfully:', savedModel)

  // Always create version snapshot
  console.log('Creating version snapshot...')
  await createVersionSnapshot(savedModel, options.changeSummary || 'Manual save')

  return savedModel
}

// Load Function Model use case
export const loadFunctionModel = async (
  id: string,
  options: LoadOptions = {}
): Promise<FunctionModel> => {
  console.log('loadFunctionModel called with:', { id, options })
  
  // If a specific version is requested, load that version
  if (options.version) {
    console.log('Loading specific version:', options.version)
    const versionModel = await functionModelRepository.getVersionById(id, options.version)
    
    if (!versionModel) {
      console.error('Version not found:', options.version, 'for model:', id)
      throw new Error(`Version ${options.version} not found for Function Model: ${id}`)
    }
    
    console.log('Version model loaded from repository:', versionModel)
    console.log('Version model nodesData:', versionModel.nodesData)
    console.log('Version model edgesData:', versionModel.edgesData)
    console.log('Version model viewportData:', versionModel.viewportData)
    return versionModel
  }
  
  // Load current model from repository
  const model = await functionModelRepository.getById(id)

  if (!model) {
    console.error('Model not found:', id)
    throw new Error(`Function Model not found: ${id}`)
  }

  console.log('Model loaded from repository:', model)

  return model
}

// Create Function Model use case
export const createNewFunctionModel = async (
  name: string,
  description: string,
  options: Partial<FunctionModel> = {}
): Promise<FunctionModel> => {
  // Create new Function Model
  const newModel = createFunctionModel(name, description, options)
  
  // Save to repository
  const savedModel = await functionModelRepository.create(newModel)
  
  return savedModel
}

// Delete Function Model use case
export const deleteFunctionModel = async (id: string): Promise<void> => {
  // Validate permissions (would be implemented based on user context)
  // validateUserPermissions(id, 'delete')
  
  await functionModelRepository.delete(id)
}

// Create cross-feature link use case (placeholder implementation)
export const createNewCrossFeatureLink = async (
  sourceFeature: string,
  sourceId: string,
  targetFeature: string,
  targetId: string,
  linkType: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // Validate link parameters
  if (!sourceFeature || !sourceId || !targetFeature || !targetId || !linkType) {
    throw new Error('Missing required link parameters')
  }

  // Create the link using repository
  const linkData = await functionModelRepository.createCrossFeatureLink(
    sourceFeature,
    sourceId,
    null, // sourceNodeId - for model-level links
    targetFeature,
    targetId,
    null, // targetNodeId - for model-level links
    linkType,
    context
  )

  // Convert to CrossFeatureLink format
  const link: CrossFeatureLink = {
    linkId: linkData.link_id,
    sourceFeature: linkData.source_feature as any,
    sourceId: linkData.source_id,
    targetFeature: linkData.target_feature as any,
    targetId: linkData.target_id,
    linkType: linkData.link_type as any,
    linkStrength: linkData.link_strength,
    linkContext: linkData.link_context,
    createdAt: new Date(linkData.created_at),
    createdBy: linkData.created_by
  }

  console.log('Cross-feature link created successfully:', link)
  return link
}

// Get cross-feature links use case
export const getCrossFeatureLinks = async (
  sourceId: string,
  sourceFeature: string
): Promise<CrossFeatureLink[]> => {
  console.log('Getting cross-feature links:', { sourceId, sourceFeature })
  
  const linkData = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
  
  // Convert to CrossFeatureLink format
  const links: CrossFeatureLink[] = linkData.map((link: any) => ({
    linkId: link.link_id,
    sourceFeature: link.source_feature as any,
    sourceId: link.source_id,
    targetFeature: link.target_feature as any,
    targetId: link.target_id,
    linkType: link.link_type as any,
    linkStrength: link.link_strength,
    linkContext: link.link_context,
    createdAt: new Date(link.created_at),
    createdBy: link.created_by
  }))
  
  console.log('Cross-feature links loaded:', links)
  return links
}

// Update cross-feature link context use case
export const updateCrossFeatureLinkContext = async (
  linkId: string,
  context: Record<string, any>
): Promise<void> => {
  console.log('Updating cross-feature link context:', { linkId, context })
  
  await functionModelRepository.updateCrossFeatureLinkContext(linkId, context)
  
  console.log('Cross-feature link context updated successfully')
}

// Delete cross-feature link use case
export const deleteCrossFeatureLink = async (linkId: string): Promise<void> => {
  console.log('Deleting cross-feature link:', linkId)
  
  await functionModelRepository.deleteCrossFeatureLink(linkId)
  
  console.log('Cross-feature link deleted successfully')
}

// Node-level linking use cases
export const createNodeLink = async (
  modelId: string,
  nodeId: string,
  targetFeature: string,
  targetId: string,
  linkType: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  console.log('Creating node link:', { modelId, nodeId, targetFeature, targetId, linkType, context })
  
  const linkData = await functionModelRepository.createCrossFeatureLink(
    'function-model',
    modelId,
    nodeId, // sourceNodeId - for node-level links
    targetFeature,
    targetId,
    null, // targetNodeId - for model-level links
    linkType,
    context
  )
  
  // Convert to CrossFeatureLink format
  const link: CrossFeatureLink = {
    linkId: linkData.link_id,
    sourceFeature: linkData.source_feature as any,
    sourceId: linkData.source_id,
    targetFeature: linkData.target_feature as any,
    targetId: linkData.target_id,
    linkType: linkData.link_type as any,
    linkStrength: linkData.link_strength,
    linkContext: linkData.link_context,
    createdAt: new Date(linkData.created_at),
    createdBy: linkData.created_by
  }
  
  console.log('Node link created successfully:', link)
  return link
}

export const getNodeLinks = async (
  modelId: string,
  nodeId: string
): Promise<CrossFeatureLink[]> => {
  console.log('Getting node links:', { modelId, nodeId })
  
  // Get all links for this model and filter by nodeId
  const linkData = await functionModelRepository.getCrossFeatureLinks(modelId, 'function-model')
  
  // Filter links that have the specific nodeId
  const nodeLinks = linkData.filter((link: any) => link.node_context?.nodeId === nodeId)
  
  // Convert to CrossFeatureLink format
  const links: CrossFeatureLink[] = nodeLinks.map((link: any) => ({
    linkId: link.link_id,
    sourceFeature: link.source_feature as any,
    sourceId: link.source_id,
    targetFeature: link.target_feature as any,
    targetId: link.target_id,
    linkType: link.link_type as any,
    linkStrength: link.link_strength,
    linkContext: link.link_context,
    createdAt: new Date(link.created_at),
    createdBy: link.created_by
  }))
  
  console.log('Node links loaded:', links)
  return links
}

export const deleteNodeLink = async (linkId: string): Promise<void> => {
  // TODO: Implement actual node link deletion in new architecture
  console.log('Deleting node link (placeholder):', linkId)
}

// Nested function model use cases (placeholder implementations)
export const linkFunctionModelToNode = async (
  parentModelId: string,
  nodeId: string,
  childModelId: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // TODO: Implement actual nested model linking in new architecture
  console.log('Linking function model to node (placeholder):', { parentModelId, nodeId, childModelId, context })
  
  const linkData = createCrossFeatureLink(
    'function-model' as any,
    parentModelId,
    'function-model' as any,
    childModelId,
    'nested' as any,
    context
  )
  
  // Add missing properties
  const link: CrossFeatureLink = {
    ...linkData,
    linkId: `nested_link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  }
  
  return link
}

export const getNestedFunctionModels = async (modelId: string): Promise<FunctionModel[]> => {
  // TODO: Implement actual nested model retrieval in new architecture
  console.log('Getting nested function models (placeholder):', modelId)
  return []
}

// Create version snapshot use case
export const createVersionSnapshot = async (
  model: FunctionModel,
  changeSummary: string
): Promise<VersionEntry> => {
  console.log('Creating version snapshot:', { model: model.modelId, changeSummary })
  
  // Get the latest version number to avoid conflicts
  const versionHistory = await getVersionHistory(model.modelId)
  const latestVersion = versionHistory.length > 0 ? versionHistory[0].version : '1.0.0'
  
  // Increment version number to create new version
  const newVersion = incrementVersion(latestVersion, false) // false = minor version increment
  
  console.log('Version increment:', { latestVersion, newVersion })
  
  const changeDescriptionData = createChangeDescription(
    'metadata-changed',
    model.modelId,
    changeSummary
  )

  const snapshotData = createFunctionModelSnapshot(
    model.modelId,
    newVersion, // Use new version number
    model.nodesData,
    model.edgesData,
    model.viewportData,
    model.metadata,
    model.name,
    model.description,
    model.status,
    model.processType,
    model.complexityLevel,
    model.estimatedDuration,
    model.tags,
    model.permissions,
    model.relationships,
    model.createdAt,
    model.updatedAt,
    model.lastSavedAt
  )

  const versionEntryData = createVersionEntry(
    newVersion, // Use new version number
    'current-user',
    [{
      ...changeDescriptionData,
      timestamp: new Date()
    }],
    {
      ...snapshotData,
      timestamp: new Date()
    }
  )

  const versionEntry = {
    ...versionEntryData,
    timestamp: new Date()
  }

  // Save version to database
  console.log('Saving version to database:', versionEntry)
  await functionModelRepository.saveVersion(model.modelId, versionEntry)
  console.log('Version saved successfully')

  return versionEntry
}

// Get version history use case (placeholder implementation)
export const getVersionHistory = async (modelId: string): Promise<VersionEntry[]> => {
  console.log('getVersionHistory called with modelId:', modelId)
  
  try {
    // Load version history from function_model_versions table
    const versionData = await functionModelRepository.getVersionHistory(modelId)

    console.log('Version data loaded:', versionData)

    // Convert version data to VersionEntry format
    const versionHistory = (versionData || []).map((version: any) => ({
      version: version.version,
      timestamp: new Date(version.timestamp),
      author: version.author || 'unknown',
      changes: [], // TODO: Parse changes from version_data if available
      snapshot: {
        modelId: version.snapshot?.modelId || '',
        version: version.version,
        nodesData: version.snapshot?.nodesData || [],
        edgesData: version.snapshot?.edgesData || [],
        viewportData: version.snapshot?.viewportData || {},
        metadata: version.snapshot?.metadata || {},
        timestamp: new Date(version.timestamp)
      },
      isPublished: version.isPublished || false
    }))

    console.log('Version history converted:', versionHistory)
    return versionHistory
  } catch (err) {
    console.error('Error in getVersionHistory:', err)
    throw err
  }
}

// Publish version use case (placeholder implementation)
export const publishVersion = async (modelId: string, version: string): Promise<void> => {
  // TODO: Implement actual version publishing in new architecture
  console.log('Publishing version (placeholder):', { modelId, version })
}

// Search Function Models use case
export const searchFunctionModels = async (
  query: string,
  filters: FunctionModelFilters
): Promise<FunctionModel[]> => {
  return await functionModelRepository.search(query, filters)
}

// Get Function Models by user use case (placeholder implementation)
export const getFunctionModelsByUser = async (userId: string): Promise<FunctionModel[]> => {
  // TODO: Implement actual user-based filtering in new architecture
  console.log('Getting function models by user (placeholder):', userId)
  return await functionModelRepository.getAll()
}

// Get Function Models by category use case (placeholder implementation)
export const getFunctionModelsByCategory = async (category: string): Promise<FunctionModel[]> => {
  // TODO: Implement actual category-based filtering in new architecture
  console.log('Getting function models by category (placeholder):', category)
  return await functionModelRepository.getAll()
}

// Get Function Models by process type use case (placeholder implementation)
export const getFunctionModelsByProcessType = async (processType: string): Promise<FunctionModel[]> => {
  // TODO: Implement actual process type-based filtering in new architecture
  console.log('Getting function models by process type (placeholder):', processType)
  return await functionModelRepository.getAll()
}

// Get all Function Models use case
export const getAllFunctionModels = async (): Promise<FunctionModel[]> => {
  return await functionModelRepository.getAll()
}

// Validate Function Model use case
export const validateFunctionModel = (model: any): model is FunctionModel => {
  return isValidFunctionModel(model)
}

// Validate cross-feature link use case
export const validateCrossFeatureLink = (link: any): link is CrossFeatureLink => {
  return isValidCrossFeatureLink(link)
}

// Update Function Model metadata use case
export const updateFunctionModelMetadata = async (
  modelId: string,
  metadata: Partial<FunctionModel['metadata']>
): Promise<FunctionModel> => {
  const model = await functionModelRepository.getById(modelId)
  if (!model) {
    throw new Error(`Function Model not found: ${modelId}`)
  }

  const updatedModel = {
    ...model,
    metadata: {
      ...model.metadata,
      ...metadata
    }
  }

  return await functionModelRepository.update(modelId, updatedModel)
}

// Update Function Model permissions use case
export const updateFunctionModelPermissions = async (
  modelId: string,
  permissions: Partial<FunctionModel['permissions']>
): Promise<FunctionModel> => {
  const model = await functionModelRepository.getById(modelId)
  if (!model) {
    throw new Error(`Function Model not found: ${modelId}`)
  }

  const updatedModel = {
    ...model,
    permissions: {
      ...model.permissions,
      ...permissions
    }
  }

  return await functionModelRepository.update(modelId, updatedModel)
}

// Export Function Model use case
export const exportFunctionModel = async (
  modelId: string,
  format: 'json' | 'xml' | 'yaml' = 'json'
): Promise<string> => {
  const model = await loadFunctionModel(modelId)
  
  switch (format) {
    case 'json':
      return JSON.stringify(model, null, 2)
    case 'xml':
      return convertToXML(model)
    case 'yaml':
      return convertToYAML(model)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

// Import Function Model use case
export const importFunctionModel = async (
  data: string,
  format: 'json' | 'xml' | 'yaml' = 'json'
): Promise<FunctionModel> => {
  let modelData: any

  switch (format) {
    case 'json':
      modelData = JSON.parse(data)
      break
    case 'xml':
      modelData = parseFromXML(data)
      break
    case 'yaml':
      modelData = parseFromYAML(data)
      break
    default:
      throw new Error(`Unsupported import format: ${format}`)
  }

  // Validate imported data
  if (!isValidFunctionModel(modelData)) {
    throw new Error('Invalid Function Model data in import')
  }

  // Create new model with imported data
  const newModel = createFunctionModel(
    modelData.name,
    modelData.description,
    {
      ...modelData,
      modelId: undefined, // Remove ID to create new model
      createdAt: undefined,
      updatedAt: undefined,
      lastSavedAt: undefined
    }
  )

  return await functionModelRepository.create(newModel)
}

// Helper functions for export/import
function convertToXML(model: FunctionModel): string {
  // Simple XML conversion - would use a proper XML library in production
  return `<?xml version="1.0" encoding="UTF-8"?>
<functionModel>
  <name>${model.name}</name>
  <description>${model.description}</description>
  <version>${model.version}</version>
  <status>${model.status}</status>
  <!-- Additional XML structure would be implemented -->
</functionModel>`
}

function convertToYAML(model: FunctionModel): string {
  // Simple YAML conversion - would use a proper YAML library in production
  return `name: ${model.name}
description: ${model.description}
version: ${model.version}
status: ${model.status}
# Additional YAML structure would be implemented`
}

function parseFromXML(xmlData: string): any {
  // Simple XML parsing - would use a proper XML library in production
  // This is a placeholder implementation
  return {
    name: 'Imported Model',
    description: 'Imported from XML',
    version: '1.0.0',
    status: 'draft'
  }
}

function parseFromYAML(yamlData: string): any {
  // Simple YAML parsing - would use a proper YAML library in production
  // This is a placeholder implementation
  return {
    name: 'Imported Model',
    description: 'Imported from YAML',
    version: '1.0.0',
    status: 'draft'
  }
} 