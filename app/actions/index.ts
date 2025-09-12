/**
 * Server Actions Index
 * 
 * This file exports all Server Actions for the Interface Adapter layer,
 * providing a centralized entry point for all server-side form handling
 * and API operations in the Next.js application.
 */

// Model Management Actions
export {
  createModelAction,
  createModelActionWithState,
  updateModelAction,
  publishModelAction,
  archiveModelAction
} from './model-actions';

// Node Management Actions
export {
  addNodeAction,
  updateNodeAction,
  deleteNodeAction
} from './node-actions';

// Execution Actions
export {
  executeModelAction,
  stopExecutionAction,
  pauseExecutionAction,
  resumeExecutionAction,
  getExecutionStatusAction
} from './execution-actions';

// DTO Types
export * from './types';

/**
 * Action Categories for UI organization
 */
export const ActionCategories = {
  MODEL: 'model',
  NODE: 'node',
  EXECUTION: 'execution',
  VALIDATION: 'validation',
  EXPORT: 'export',
  IMPORT: 'import'
} as const;

/**
 * Action Permissions for role-based access
 */
export const ActionPermissions = {
  CREATE_MODEL: ['owner', 'editor'],
  UPDATE_MODEL: ['owner', 'editor'],
  PUBLISH_MODEL: ['owner', 'editor', 'publisher'],
  ARCHIVE_MODEL: ['owner', 'archiver', 'admin'],
  ADD_NODE: ['owner', 'editor'],
  UPDATE_NODE: ['owner', 'editor'],
  DELETE_NODE: ['owner', 'editor'],
  EXECUTE_MODEL: ['owner', 'editor', 'executor', 'viewer'],
  STOP_EXECUTION: ['owner', 'editor', 'executor']
} as const;

/**
 * Default action configurations
 */
export const ActionDefaults = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_COUNT: 3,
  CACHE_TTL: 300, // 5 minutes
  BATCH_SIZE: 50
} as const;