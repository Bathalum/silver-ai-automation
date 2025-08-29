import { describe, expect, it, test } from '@jest/globals';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * Result Pattern Tests - TDD Definition of Functional Result Monad
 * 
 * These tests define the complete Result pattern behavior including:
 * - Safe value access patterns
 * - Functional composition with map, flatMap
 * - Error handling and propagation
 * - Result combination patterns
 * - Architectural boundary enforcement
 * 
 * Critical Requirements:
 * 1. Must prevent unsafe access to .value on failed Results
 * 2. Must provide functional composition methods (.map, .flatMap)
 * 3. Must support safe pattern matching and chaining
 * 4. Must act as boundary filter preventing errors from propagating
 * 5. Must serve as template for proper Result usage
 */
describe('Result Pattern - Core Behavior Definition', () => {
  
  describe('Result Creation and Basic Properties', () => {
    
    test('ok_ValidValue_ShouldCreateSuccessResult', () => {
      // Arrange
      const testValue = 'success-value';
      
      // Act
      const result = Result.ok(testValue);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBe(testValue);
    });
    
    test('fail_ErrorMessage_ShouldCreateFailureResult', () => {
      // Arrange
      const errorMessage = 'Operation failed';
      
      // Act
      const result = Result.fail<string>(errorMessage);
      
      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(errorMessage);
    });
    
    test('value_OnFailedResult_ShouldThrowError', () => {
      // Arrange
      const failedResult = Result.fail<string>('test error');
      
      // Act & Assert
      expect(() => failedResult.value).toThrow('Cannot get value from failed result');
    });
    
    test('error_OnSuccessResult_ShouldThrowError', () => {
      // Arrange
      const successResult = Result.ok('test value');
      
      // Act & Assert
      expect(() => successResult.error).toThrow('Cannot get error from successful result');
    });
  });
  
  describe('Functional Composition - Map Operations', () => {
    
    test('map_OnSuccessResult_ShouldTransformValue', () => {
      // Arrange
      const initialValue = 10;
      const successResult = Result.ok(initialValue);
      const transformer = (x: number) => x * 2;
      
      // Act
      const mappedResult = successResult.map(transformer);
      
      // Assert
      expect(mappedResult.isSuccess).toBe(true);
      expect(mappedResult.value).toBe(20);
    });
    
    test('map_OnFailedResult_ShouldPropagateFailure', () => {
      // Arrange
      const failedResult = Result.fail<number>('calculation error');
      const transformer = (x: number) => x * 2;
      
      // Act
      const mappedResult = failedResult.map(transformer);
      
      // Assert
      expect(mappedResult.isSuccess).toBe(false);
      expect(mappedResult.isFailure).toBe(true);
      expect(mappedResult.error).toBe('calculation error');
    });
    
    test('map_ChainedOperations_ShouldComposeCorrectly', () => {
      // Arrange
      const initialValue = 5;
      const successResult = Result.ok(initialValue);
      
      // Act
      const finalResult = successResult
        .map(x => x * 2)
        .map(x => x + 1)
        .map(x => x.toString());
      
      // Assert
      expect(finalResult.isSuccess).toBe(true);
      expect(finalResult.value).toBe('11');
    });
    
    test('map_ChainWithFailure_ShouldStopAtFirstFailure', () => {
      // Arrange
      const failedResult = Result.fail<number>('initial error');
      
      // Act
      const finalResult = failedResult
        .map(x => x * 2)
        .map(x => x + 1);
      
      // Assert
      expect(finalResult.isSuccess).toBe(false);
      expect(finalResult.error).toBe('initial error');
    });
    
    test('map_WithTypeTransformation_ShouldChangeResultType', () => {
      // Arrange
      const numberResult = Result.ok(42);
      
      // Act
      const stringResult = numberResult.map(n => `Number: ${n}`);
      
      // Assert
      expect(stringResult.isSuccess).toBe(true);
      expect(stringResult.value).toBe('Number: 42');
    });
  });
  
  describe('Monadic Operations - FlatMap', () => {
    
    test('flatMap_OnSuccessResult_ShouldFlattenNestedResult', () => {
      // Arrange
      const successResult = Result.ok(10);
      const resultReturningFunction = (x: number) => Result.ok(x * 2);
      
      // Act
      const flatMappedResult = successResult.flatMap(resultReturningFunction);
      
      // Assert
      expect(flatMappedResult.isSuccess).toBe(true);
      expect(flatMappedResult.value).toBe(20);
    });
    
    test('flatMap_OnFailedResult_ShouldPropagateFailure', () => {
      // Arrange
      const failedResult = Result.fail<number>('initial error');
      const resultReturningFunction = (x: number) => Result.ok(x * 2);
      
      // Act
      const flatMappedResult = failedResult.flatMap(resultReturningFunction);
      
      // Assert
      expect(flatMappedResult.isSuccess).toBe(false);
      expect(flatMappedResult.error).toBe('initial error');
    });
    
    test('flatMap_FunctionReturnsFailure_ShouldPropagateInnerFailure', () => {
      // Arrange
      const successResult = Result.ok(10);
      const failingFunction = (x: number) => Result.fail<number>('operation failed');
      
      // Act
      const flatMappedResult = successResult.flatMap(failingFunction);
      
      // Assert
      expect(flatMappedResult.isSuccess).toBe(false);
      expect(flatMappedResult.error).toBe('operation failed');
    });
    
    test('flatMap_ChainedOperations_ShouldComposeMonadically', () => {
      // Arrange
      const divide = (x: number, y: number): Result<number> => {
        if (y === 0) return Result.fail<number>('Division by zero');
        return Result.ok(x / y);
      };
      
      // Act
      const result = Result.ok(20)
        .flatMap(x => divide(x, 2))
        .flatMap(x => divide(x, 5));
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(2);
    });
    
    test('flatMap_WithEarlyFailure_ShouldStopChainExecution', () => {
      // Arrange
      const divide = (x: number, y: number): Result<number> => {
        if (y === 0) return Result.fail<number>('Division by zero');
        return Result.ok(x / y);
      };
      
      // Act
      const result = Result.ok(20)
        .flatMap(x => divide(x, 0)) // This will fail
        .flatMap(x => divide(x, 5)); // This should not execute
      
      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('Division by zero');
    });
  });
  
  describe('Safe Value Access Patterns', () => {
    
    test('getOrElse_OnSuccessResult_ShouldReturnValue', () => {
      // Arrange
      const successResult = Result.ok('success-value');
      const defaultValue = 'default-value';
      
      // Act
      const value = successResult.getOrElse(defaultValue);
      
      // Assert
      expect(value).toBe('success-value');
    });
    
    test('getOrElse_OnFailedResult_ShouldReturnDefault', () => {
      // Arrange
      const failedResult = Result.fail<string>('error occurred');
      const defaultValue = 'default-value';
      
      // Act
      const value = failedResult.getOrElse(defaultValue);
      
      // Assert
      expect(value).toBe('default-value');
    });
    
    test('fold_OnSuccessResult_ShouldExecuteSuccessHandler', () => {
      // Arrange
      const successResult = Result.ok(10);
      const onSuccess = (value: number) => `Success: ${value}`;
      const onFailure = (error: string) => `Error: ${error}`;
      
      // Act
      const result = successResult.fold(onSuccess, onFailure);
      
      // Assert
      expect(result).toBe('Success: 10');
    });
    
    test('fold_OnFailedResult_ShouldExecuteFailureHandler', () => {
      // Arrange
      const failedResult = Result.fail<number>('operation failed');
      const onSuccess = (value: number) => `Success: ${value}`;
      const onFailure = (error: string) => `Error: ${error}`;
      
      // Act
      const result = failedResult.fold(onSuccess, onFailure);
      
      // Assert
      expect(result).toBe('Error: operation failed');
    });
  });
  
  describe('Result Combination Patterns', () => {
    
    test('combine_AllSuccessResults_ShouldReturnSuccessWithValues', () => {
      // Arrange
      const results = [
        Result.ok('first'),
        Result.ok('second'),
        Result.ok('third')
      ];
      
      // Act
      const combinedResult = Result.combine(results);
      
      // Assert
      expect(combinedResult.isSuccess).toBe(true);
      expect(combinedResult.value).toEqual(['first', 'second', 'third']);
    });
    
    test('combine_WithFailureResult_ShouldReturnFailure', () => {
      // Arrange
      const results = [
        Result.ok('first'),
        Result.fail<string>('error in second'),
        Result.ok('third')
      ];
      
      // Act
      const combinedResult = Result.combine(results);
      
      // Assert
      expect(combinedResult.isSuccess).toBe(false);
      expect(combinedResult.error).toBe('error in second');
    });
    
    test('combine_MultipleFailures_ShouldCombineErrors', () => {
      // Arrange
      const results = [
        Result.fail<string>('first error'),
        Result.fail<string>('second error'),
        Result.ok('success')
      ];
      
      // Act
      const combinedResult = Result.combine(results);
      
      // Assert
      expect(combinedResult.isSuccess).toBe(false);
      expect(combinedResult.error).toBe('first error, second error');
    });
    
    test('combine_EmptyArray_ShouldReturnEmptySuccess', () => {
      // Arrange
      const results: Result<string>[] = [];
      
      // Act
      const combinedResult = Result.combine(results);
      
      // Assert
      expect(combinedResult.isSuccess).toBe(true);
      expect(combinedResult.value).toEqual([]);
    });
  });
  
  describe('Error Recovery Patterns', () => {
    
    test('recover_OnFailedResult_ShouldRecoverWithValue', () => {
      // Arrange
      const failedResult = Result.fail<string>('operation failed');
      const recoveryValue = 'recovered-value';
      
      // Act
      const recoveredResult = failedResult.recover(() => recoveryValue);
      
      // Assert
      expect(recoveredResult.isSuccess).toBe(true);
      expect(recoveredResult.value).toBe('recovered-value');
    });
    
    test('recover_OnSuccessResult_ShouldReturnOriginal', () => {
      // Arrange
      const successResult = Result.ok('original-value');
      const recoveryValue = 'recovery-value';
      
      // Act
      const recoveredResult = successResult.recover(() => recoveryValue);
      
      // Assert
      expect(recoveredResult.isSuccess).toBe(true);
      expect(recoveredResult.value).toBe('original-value');
    });
    
    test('recoverWith_OnFailedResult_ShouldRecoverWithResult', () => {
      // Arrange
      const failedResult = Result.fail<string>('operation failed');
      const recoveryResult = Result.ok('recovered-value');
      
      // Act
      const recoveredResult = failedResult.recoverWith(() => recoveryResult);
      
      // Assert
      expect(recoveredResult.isSuccess).toBe(true);
      expect(recoveredResult.value).toBe('recovered-value');
    });
    
    test('recoverWith_RecoveryAlsoFails_ShouldReturnRecoveryFailure', () => {
      // Arrange
      const failedResult = Result.fail<string>('original error');
      const recoveryFailure = Result.fail<string>('recovery failed');
      
      // Act
      const recoveredResult = failedResult.recoverWith(() => recoveryFailure);
      
      // Assert
      expect(recoveredResult.isSuccess).toBe(false);
      expect(recoveredResult.error).toBe('recovery failed');
    });
  });
  
  describe('Side Effects and Inspection', () => {
    
    test('tap_OnSuccessResult_ShouldExecuteSideEffectAndReturnOriginal', () => {
      // Arrange
      const successResult = Result.ok(42);
      let sideEffectValue: number | null = null;
      const sideEffect = (value: number) => { sideEffectValue = value; };
      
      // Act
      const tappedResult = successResult.tap(sideEffect);
      
      // Assert
      expect(tappedResult).toBe(successResult); // Same reference
      expect(sideEffectValue).toBe(42);
    });
    
    test('tap_OnFailedResult_ShouldNotExecuteSideEffect', () => {
      // Arrange
      const failedResult = Result.fail<number>('error');
      let sideEffectExecuted = false;
      const sideEffect = () => { sideEffectExecuted = true; };
      
      // Act
      const tappedResult = failedResult.tap(sideEffect);
      
      // Assert
      expect(tappedResult).toBe(failedResult); // Same reference
      expect(sideEffectExecuted).toBe(false);
    });
    
    test('tapError_OnFailedResult_ShouldExecuteSideEffectAndReturnOriginal', () => {
      // Arrange
      const failedResult = Result.fail<number>('test error');
      let sideEffectError: string | null = null;
      const sideEffect = (error: string) => { sideEffectError = error; };
      
      // Act
      const tappedResult = failedResult.tapError(sideEffect);
      
      // Assert
      expect(tappedResult).toBe(failedResult); // Same reference
      expect(sideEffectError).toBe('test error');
    });
    
    test('tapError_OnSuccessResult_ShouldNotExecuteSideEffect', () => {
      // Arrange
      const successResult = Result.ok(42);
      let sideEffectExecuted = false;
      const sideEffect = () => { sideEffectExecuted = true; };
      
      // Act
      const tappedResult = successResult.tapError(sideEffect);
      
      // Assert
      expect(tappedResult).toBe(successResult); // Same reference
      expect(sideEffectExecuted).toBe(false);
    });
  });
  
  describe('Architectural Boundary Enforcement', () => {
    
    test('Result_ShouldPreventDirectValueAccess_OnFailedResult', () => {
      // Arrange
      const failedResult = Result.fail<string>('domain rule violation');
      
      // Act & Assert - This pattern should be used in tests
      if (failedResult.isSuccess) {
        // Only access .value if success
        expect(failedResult.value).toBeDefined();
      } else {
        // Use safe access patterns for failures
        expect(failedResult.error).toBe('domain rule violation');
        expect(() => failedResult.value).toThrow();
      }
    });
    
    test('Result_ShouldEnforceProperUsagePattern_InTestCode', () => {
      // Arrange
      const createEntity = (name: string): Result<{ name: string }> => {
        if (!name) return Result.fail<{ name: string }>('Name is required');
        return Result.ok({ name });
      };
      
      // Act
      const result = createEntity('');
      
      // Assert - Proper test pattern
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      
      // Safe error access
      const errorMessage = result.fold(
        value => `Success: ${value.name}`,
        error => `Error: ${error}`
      );
      expect(errorMessage).toBe('Error: Name is required');
    });
    
    test('Result_ShouldSupportTemplatePattern_ForEntityCreation', () => {
      // Arrange - Template showing proper Result usage in entity creation
      const createEntitySafely = (id: string, name: string) => {
        // Multiple validation steps that can fail
        if (!id) return Result.fail<{ id: string, name: string }>('ID is required');
        if (!name) return Result.fail<{ id: string, name: string }>('Name is required');
        if (id.length < 3) return Result.fail<{ id: string, name: string }>('ID too short');
        
        return Result.ok({ id, name });
      };
      
      // Act & Assert - Success case
      const successResult = createEntitySafely('test-123', 'Test Entity');
      expect(successResult.isSuccess).toBe(true);
      if (successResult.isSuccess) { // Guard clause pattern
        expect(successResult.value.id).toBe('test-123');
        expect(successResult.value.name).toBe('Test Entity');
      }
      
      // Act & Assert - Failure case
      const failureResult = createEntitySafely('ab', 'Test Entity');
      expect(failureResult.isFailure).toBe(true);
      expect(failureResult.getOrElse({ id: 'default', name: 'default' })).toEqual({ id: 'default', name: 'default' });
    });
  });
});

/**
 * Result Pattern Usage Examples - Templates for Test Development
 * 
 * These tests serve as templates showing correct Result pattern usage
 * that should be adopted throughout the test suite.
 */
describe('Result Pattern - Usage Templates', () => {
  
  describe('Entity Creation Pattern Template', () => {
    
    test('CreateEntity_WithValidation_ShouldUseResultPattern', () => {
      // Template: How to properly create entities with Result pattern
      const createTestEntity = (id: string): Result<{ id: string }> => {
        if (!id) return Result.fail<{ id: string }>('ID required');
        return Result.ok({ id });
      };
      
      // Template: How to properly test entity creation
      const result = createTestEntity('test-id');
      
      // Template: Always check success before accessing value
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe('test-id');
      }
      
      // Template: How to test failures safely
      const failureResult = createTestEntity('');
      expect(failureResult.isSuccess).toBe(false);
      expect(failureResult.getOrElse({ id: 'default' })).toEqual({ id: 'default' });
    });
    
    test('ValueObject_Creation_ShouldFollowResultPattern', () => {
      // Template: Value object creation pattern
      const createValueObject = (value: string): Result<{ value: string }> => {
        if (!value.trim()) return Result.fail<{ value: string }>('Value cannot be empty');
        if (value.length > 100) return Result.fail<{ value: string }>('Value too long');
        return Result.ok({ value: value.trim() });
      };
      
      // Template: Chain operations safely
      const result = createValueObject('  test value  ')
        .map(vo => ({ ...vo, processed: true }))
        .map(vo => ({ ...vo, timestamp: Date.now() }));
      
      expect(result.isSuccess).toBe(true);
      result.tap(value => {
        expect(value.value).toBe('test value');
        expect(value.processed).toBe(true);
        expect(value.timestamp).toBeDefined();
      });
    });
  });
  
  describe('Error Handling Pattern Template', () => {
    
    test('MultiStep_Operation_ShouldUseResultChaining', () => {
      // Template: Multi-step operations with Result chaining
      const step1 = (input: number): Result<number> => {
        if (input < 0) return Result.fail<number>('Input must be positive');
        return Result.ok(input * 2);
      };
      
      const step2 = (input: number): Result<string> => {
        if (input > 100) return Result.fail<string>('Value too large');
        return Result.ok(`Processed: ${input}`);
      };
      
      // Template: Chain operations with flatMap
      const result = Result.ok(10)
        .flatMap(step1)
        .flatMap(step2);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getOrElse('failed')).toBe('Processed: 20');
      
      // Template: Test early failure
      const failureResult = Result.ok(-5)
        .flatMap(step1)
        .flatMap(step2);
      
      expect(failureResult.isSuccess).toBe(false);
      expect(failureResult.error).toBe('Input must be positive');
    });
  });
});