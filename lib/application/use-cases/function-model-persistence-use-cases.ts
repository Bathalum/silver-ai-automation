// Function Model Persistence Use Cases
// This file implements the business logic for Function Model persistence operations

import { functionModelRepository } from '../../infrastructure/repositories/function-model-repository'
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
    updatedModel.version = incrementVersion(model.version, false)
    updatedModel.currentVersion = updatedModel.version
    console.log('Version incremented to:', updatedModel.version)
  }

  // Save to repository
  console.log('Calling repository update...')
  const savedModel = await functionModelRepository.update(model.modelId, updatedModel)
  console.log('Model saved successfully:', savedModel)

  // Create version snapshot if auto-versioning is enabled
  if (options.autoVersion) {
    console.log('Creating version snapshot...')
    await createVersionSnapshot(savedModel, options.changeSummary || 'Auto-save')
  }

  return savedModel
}

// Load Function Model use case
export const loadFunctionModel = async (
  id: string,
  options: LoadOptions = {}
): Promise<FunctionModel> => {
  console.log('loadFunctionModel called with:', { id, options })
  
  // Load from repository
  const model = options.version 
    ? await functionModelRepository.getVersion(id, options.version)
    : await functionModelRepository.getById(id)

  if (!model) {
    console.error('Model not found:', id)
    throw new Error(`Function Model not found: ${id}`)
  }

  console.log('Model loaded from repository:', model)

  // Load version history if requested
  if (options.includeMetadata) {
    console.log('Loading version history...')
    const versionHistory = await functionModelRepository.getVersionHistory(id)
    model.versionHistory = versionHistory
    console.log('Version history loaded:', versionHistory)
  }

  // Load cross-feature links if requested
  if (options.includeRelationships) {
    const links = await functionModelRepository.getCrossFeatureLinks(id, 'function-model')
    // Note: Links would be stored in metadata or as a separate property
  }

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

// Create cross-feature link use case
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

  // Check for existing links to prevent duplicates
  const existingLinks = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
  const duplicate = existingLinks.find(link => 
    link.targetFeature === targetFeature && link.targetId === targetId
  )

  if (duplicate) {
    throw new Error('Cross-feature link already exists')
  }

  // Create the link
  const link = createCrossFeatureLink(
    sourceFeature as any,
    sourceId,
    targetFeature as any,
    targetId,
    linkType as any,
    context
  )

  return await functionModelRepository.createCrossFeatureLink(link)
}

// Get cross-feature links use case
export const getCrossFeatureLinks = async (
  sourceId: string,
  sourceFeature: string
): Promise<CrossFeatureLink[]> => {
  return await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
}

// Update cross-feature link context use case
export const updateCrossFeatureLinkContext = async (
  linkId: string,
  context: Record<string, any>
): Promise<void> => {
  await functionModelRepository.updateLinkContext(linkId, context)
}

// Delete cross-feature link use case
export const deleteCrossFeatureLink = async (linkId: string): Promise<void> => {
  await functionModelRepository.deleteCrossFeatureLink(linkId)
}

// Create version snapshot use case
export const createVersionSnapshot = async (
  model: FunctionModel,
  changeSummary: string
): Promise<VersionEntry> => {
  // Create change description
  const changeDescription = createChangeDescription(
    'metadata-changed',
    model.modelId,
    changeSummary
  )

  // Create snapshot
  const snapshot = createFunctionModelSnapshot(
    model.modelId,
    model.version,
    model.nodesData,
    model.edgesData,
    model.viewportData,
    model.metadata,
    // Pass additional model fields for complete reconstruction
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

  // Create version entry
  const versionEntry = createVersionEntry(
    model.version,
    'current-user', // Would get from auth context
    [changeDescription],
    snapshot
  )

  // Save version to repository
  await functionModelRepository.saveVersion(model.modelId, versionEntry)

  return {
    ...versionEntry,
    timestamp: new Date()
  }
}

// Get version history use case
export const getVersionHistory = async (modelId: string): Promise<VersionEntry[]> => {
  console.log('getVersionHistory called with modelId:', modelId)
  const versionHistory = await functionModelRepository.getVersionHistory(modelId)
  console.log('getVersionHistory result:', versionHistory)
  return versionHistory
}

// Publish version use case
export const publishVersion = async (modelId: string, version: string): Promise<void> => {
  // Validate version exists
  const versionHistory = await functionModelRepository.getVersionHistory(modelId)
  const versionExists = versionHistory.some(v => v.version === version)
  
  if (!versionExists) {
    throw new Error(`Version ${version} not found`)
  }

  await functionModelRepository.publishVersion(modelId, version)
}

// Search Function Models use case
export const searchFunctionModels = async (
  query: string,
  filters: FunctionModelFilters
): Promise<FunctionModel[]> => {
  return await functionModelRepository.search(query, filters)
}

// Get Function Models by user use case
export const getFunctionModelsByUser = async (userId: string): Promise<FunctionModel[]> => {
  return await functionModelRepository.getByUser(userId)
}

// Get Function Models by category use case
export const getFunctionModelsByCategory = async (category: string): Promise<FunctionModel[]> => {
  return await functionModelRepository.getByCategory(category)
}

// Get Function Models by process type use case
export const getFunctionModelsByProcessType = async (processType: string): Promise<FunctionModel[]> => {
  return await functionModelRepository.getByProcessType(processType)
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
  const model = await loadFunctionModel(modelId, { includeMetadata: true, includeRelationships: true })
  
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