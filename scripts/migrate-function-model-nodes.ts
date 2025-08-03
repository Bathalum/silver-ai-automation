#!/usr/bin/env tsx

import { migrateFunctionModelNodes, validateFunctionModelNodeMigration } from '../lib/infrastructure/migrations/function-model-node-migration'

async function main() {
  console.log('🚀 Starting Function Model Node Migration...\n')

  try {
    // Run the migration
    const result = await migrateFunctionModelNodes()
    
    console.log('\n✅ Migration completed successfully!')
    console.log(`   Migrated: ${result.migratedCount} nodes`)
    console.log(`   Errors: ${result.errorCount} nodes`)
    
    // Validate the migration
    console.log('\n🔍 Validating migration results...')
    const validation = await validateFunctionModelNodeMigration()
    
    console.log('\n📊 Validation Results:')
    console.log(`   Original nodes: ${validation.originalNodeCount}`)
    console.log(`   Migrated nodes: ${validation.migratedNodeCount}`)
    console.log(`   Metadata records: ${validation.metadataCount}`)
    console.log(`   Success rate: ${(validation.successRate * 100).toFixed(2)}%`)
    
    if (validation.successRate >= 0.95) {
      console.log('\n🎉 Migration validation passed!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Migration validation failed - success rate below 95%')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main() 