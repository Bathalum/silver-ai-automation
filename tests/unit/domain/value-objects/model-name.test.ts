import { ModelName } from '@/lib/domain/value-objects/model-name';
import { Result } from '@/lib/domain/shared/result';

describe('ModelName Value Object', () => {
  describe('creation and validation', () => {
    describe('valid model names', () => {
      it('should create ModelName with valid alphanumeric name', () => {
        const result = ModelName.create('TestModel123');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('TestModel123');
      });

      it('should create ModelName with spaces', () => {
        const result = ModelName.create('My Test Model');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('My Test Model');
      });

      it('should create ModelName with hyphens and underscores', () => {
        const result = ModelName.create('test-model_v1');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('test-model_v1');
      });

      it('should trim whitespace from model name', () => {
        const result = ModelName.create('  Valid Model Name  ');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('Valid Model Name');
      });

      it('should create ModelName at minimum length boundary', () => {
        const result = ModelName.create('ABC');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe('ABC');
      });

      it('should create ModelName at maximum length boundary', () => {
        const longName = 'A'.repeat(100);
        const result = ModelName.create(longName);
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe(longName);
      });
    });

    describe('invalid model names', () => {
      it('should fail with empty string', () => {
        const result = ModelName.create('');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name cannot be empty');
      });

      it('should fail with null input', () => {
        const result = ModelName.create(null as any);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name cannot be empty');
      });

      it('should fail with undefined input', () => {
        const result = ModelName.create(undefined as any);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name cannot be empty');
      });

      it('should fail with only whitespace', () => {
        const result = ModelName.create('   ');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name cannot be empty');
      });

      it('should fail when too short', () => {
        const result = ModelName.create('AB');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name must be at least 3 characters long');
      });

      it('should fail when too long', () => {
        const longName = 'A'.repeat(101);
        const result = ModelName.create(longName);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name cannot exceed 100 characters');
      });

      it('should fail with invalid characters', () => {
        const result = ModelName.create('Invalid@Model!');
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Model name can only contain letters, numbers, spaces, hyphens, and underscores');
      });

      it('should fail with special characters', () => {
        const invalidChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/'];
        
        for (const char of invalidChars) {
          const result = ModelName.create(`Test${char}Model`);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBe('Model name can only contain letters, numbers, spaces, hyphens, and underscores');
        }
      });
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when values are the same', () => {
      const name1 = ModelName.create('TestModel').value!;
      const name2 = ModelName.create('TestModel').value!;
      
      expect(name1.equals(name2)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const name1 = ModelName.create('TestModel1').value!;
      const name2 = ModelName.create('TestModel2').value!;
      
      expect(name1.equals(name2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const name1 = ModelName.create('TestModel').value!;
      const name2 = ModelName.create('testmodel').value!;
      
      expect(name1.equals(name2)).toBe(false);
    });

    it('should handle trimmed whitespace in equality', () => {
      const name1 = ModelName.create('Test Model').value!;
      const name2 = ModelName.create('  Test Model  ').value!;
      
      expect(name1.equals(name2)).toBe(true);
    });
  });

  describe('string representation', () => {
    it('should return correct string representation', () => {
      const modelName = ModelName.create('My Test Model').value!;
      
      expect(modelName.toString()).toBe('My Test Model');
    });

    it('should return trimmed string representation', () => {
      const modelName = ModelName.create('  Model Name  ').value!;
      
      expect(modelName.toString()).toBe('Model Name');
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const modelName = ModelName.create('TestModel').value!;
      const originalValue = modelName.value;
      
      // Attempt to modify (should not be possible with private readonly)
      expect(modelName.value).toBe(originalValue);
      expect(modelName.toString()).toBe('TestModel');
    });

    it('should maintain value consistency', () => {
      const modelName = ModelName.create('Consistent Model').value!;
      
      // Multiple accesses should return same value
      expect(modelName.value).toBe('Consistent Model');
      expect(modelName.value).toBe(modelName.toString());
      expect(modelName.value).toBe('Consistent Model');
    });
  });

  describe('business rule validation', () => {
    it('should accept common model naming patterns', () => {
      const patterns = [
        'UserRegistration',
        'Data Processing Model',
        'API_Gateway_V2',
        'workflow-orchestrator',
        'Model 123',
        'AI Agent Coordinator'
      ];
      
      for (const pattern of patterns) {
        const result = ModelName.create(pattern);
        expect(result.isSuccess).toBe(true);
        expect(result.value!.value).toBe(pattern);
      }
    });

    it('should reject potentially problematic names', () => {
      const problematicNames = [
        '', // Empty
        '  ', // Only spaces
        'AB', // Too short
        'A'.repeat(101), // Too long
        'Model@Invalid', // Special chars
        'Test<Model>', // HTML-like
        'Model/Path', // Path-like
        'Model.exe' // Potentially dangerous extension
      ];
      
      for (const name of problematicNames) {
        const result = ModelName.create(name);
        expect(result.isFailure).toBe(true);
      }
    });
  });

  describe('Result pattern compliance', () => {
    it('should return Result.ok for valid names', () => {
      const result = ModelName.create('ValidModel');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBeInstanceOf(ModelName);
    });

    it('should return Result.fail for invalid names', () => {
      const result = ModelName.create('');
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(typeof result.error).toBe('string');
    });

    it('should provide meaningful error messages', () => {
      const testCases = [
        { input: '', expectedError: 'Model name cannot be empty' },
        { input: 'AB', expectedError: 'Model name must be at least 3 characters long' },
        { input: 'A'.repeat(101), expectedError: 'Model name cannot exceed 100 characters' },
        { input: 'Invalid@Name', expectedError: 'Model name can only contain letters, numbers, spaces, hyphens, and underscores' }
      ];
      
      for (const testCase of testCases) {
        const result = ModelName.create(testCase.input);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(testCase.expectedError);
      }
    });
  });
});