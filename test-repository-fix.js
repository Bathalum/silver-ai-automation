/**
 * Simple test script to verify repository serialization fixes
 * without database dependencies
 */

const { FunctionModel } = require('./lib/domain/entities/function-model.ts');
const { ModelName } = require('./lib/domain/value-objects/model-name.ts'); 
const { Version } = require('./lib/domain/value-objects/version.ts');
const { SupabaseFunctionModelRepository } = require('./lib/infrastructure/repositories/supabase-function-model-repository.ts');

async function testRepositoryMethods() {
    console.log('Testing repository serialization methods...');
    
    try {
        // Mock Supabase client
        const mockSupabase = {
            from: () => ({
                insert: () => ({ error: null }),
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: null })
                    })
                })
            })
        };
        
        const repository = new SupabaseFunctionModelRepository(mockSupabase);
        
        // Create test model
        const modelNameResult = ModelName.create('Test Model');
        const versionResult = Version.create('1.0.0');
        
        if (modelNameResult.isFailure) {
            console.error('ModelName.create failed:', modelNameResult.error);
            return;
        }
        
        if (versionResult.isFailure) {
            console.error('Version.create failed:', versionResult.error);
            return;
        }
        
        const modelResult = FunctionModel.create({
            name: modelNameResult.value,
            description: 'Test model',
            version: versionResult.value,
            currentVersion: versionResult.value
        });
        
        if (modelResult.isFailure) {
            console.error('FunctionModel.create failed:', modelResult.error);
            return;
        }
        
        const model = modelResult.value;
        console.log('Created model:', {
            modelId: model.modelId,
            name: model.name.value,
            version: model.version.value
        });
        
        // Test fromDomain method
        const dbRow = repository.fromDomain(model);
        console.log('Converted to database row:', {
            model_id: dbRow.model_id,
            name: dbRow.name,
            version: dbRow.version,
            status: dbRow.status
        });
        
        console.log('✓ Repository serialization test passed!');
        
    } catch (error) {
        console.error('✗ Repository test failed:', error.message);
        console.error(error.stack);
    }
}

testRepositoryMethods();