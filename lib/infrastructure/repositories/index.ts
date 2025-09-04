/**
 * Infrastructure Layer - Repository Implementations
 * 
 * Base repository classes following Clean Architecture principles.
 * These provide the foundation for all data access in the application.
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Repositories belong to Infrastructure Layer
 * - Implement domain-defined repository interfaces
 * - Use Result pattern for all operations (no thrown exceptions)
 * - Translate database errors to domain-friendly messages
 * - Do not leak infrastructure-specific types to Domain/Application layers
 */

// Base foundation repository
export { BaseSupabaseRepository } from './base-supabase-repository';

// Specialized repository implementations
export { BaseAggregateRepository } from './base-aggregate-repository';
export { BaseVersionedRepository } from './base-versioned-repository';
export { BaseAuditableRepository } from './base-auditable-repository';

// Legacy base repository (for compatibility)
export { BaseRepository } from './base-repository';

// Specific repository implementations
export { SupabaseFunctionModelRepository } from './supabase-function-model-repository';