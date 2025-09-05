/**
 * Unit tests for ExecutionContext value object
 * Tests environment validation, parameter management, and context operations
 */

import { ExecutionContext, Environment } from '@/lib/domain/value-objects/execution-context';

describe('ExecutionContext', () => {
  describe('creation and validation', () => {
    it('should create ExecutionContext with valid environment', () => {
      // Arrange
      const environment = 'development';
      const parameters = { key1: 'value1', key2: 42 };
      const sessionId = 'test-session-123';
      
      // Act
      const result = ExecutionContext.create(environment, parameters, sessionId);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.environment).toBe('development');
      expect(result.value.parameters).toEqual(parameters);
      expect(result.value.sessionId).toBe(sessionId);
      expect(result.value.createdAt).toBeInstanceOf(Date);
    });

    it('should create ExecutionContext with all valid environments', () => {
      // Arrange
      const environments: Environment[] = ['development', 'staging', 'production', 'test'];
      
      // Act & Assert
      environments.forEach(env => {
        const result = ExecutionContext.create(env);
        expect(result).toBeValidResult();
        expect(result.value.environment).toBe(env);
      });
    });

    it('should create ExecutionContext with empty parameters by default', () => {
      // Act
      const result = ExecutionContext.create('development');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.parameters).toEqual({});
      expect(result.value.getParameterCount()).toBe(0);
    });

    it('should generate session ID if not provided', () => {
      // Act
      const result = ExecutionContext.create('development');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sessionId).toMatch(/^exec-session-/);
      expect(result.value.sessionId.length).toBeGreaterThan(20);
    });

    it('should trim whitespace from environment', () => {
      // Act
      const result = ExecutionContext.create('  development  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.environment).toBe('development');
    });

    it('should trim whitespace from session ID', () => {
      // Arrange
      const sessionId = '  test-session-123  ';
      
      // Act
      const result = ExecutionContext.create('development', {}, sessionId);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sessionId).toBe('test-session-123');
    });

    it('should reject empty environment', () => {
      // Act
      const result = ExecutionContext.create('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Environment cannot be empty');
    });

    it('should reject whitespace-only environment', () => {
      // Act
      const result = ExecutionContext.create('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Environment cannot be empty');
    });

    it('should reject null environment', () => {
      // Act
      const result = ExecutionContext.create(null as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Environment cannot be empty');
    });

    it('should reject undefined environment', () => {
      // Act
      const result = ExecutionContext.create(undefined as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Environment cannot be empty');
    });

    it('should reject invalid environment', () => {
      // Act
      const result = ExecutionContext.create('invalid-env');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid environment. Must be development, staging, production, or test');
    });

    it('should reject empty session ID', () => {
      // Act
      const result = ExecutionContext.create('development', {}, '');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Session ID cannot be empty');
    });

    it('should reject whitespace-only session ID', () => {
      // Act
      const result = ExecutionContext.create('development', {}, '   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Session ID cannot be empty');
    });

    it('should reject invalid parameters object', () => {
      // Act
      const result = ExecutionContext.create('development', null as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Parameters must be an object');
    });

    it('should reject non-string session ID', () => {
      // Act
      const result = ExecutionContext.create('development', {}, 123 as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Session ID cannot be empty');
    });
  });

  describe('parameter management', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const result = ExecutionContext.create('development', { existing: 'value' }, 'test-session');
      context = result.value;
    });

    it('should add parameter successfully', () => {
      // Act
      const result = context.addParameter('newKey', 'newValue');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.getParameter('newKey')).toBe('newValue');
      expect(result.value.getParameter('existing')).toBe('value');
      expect(result.value.getParameterCount()).toBe(2);
    });

    it('should trim parameter key when adding', () => {
      // Act
      const result = context.addParameter('  spaced  ', 'value');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.hasParameter('spaced')).toBe(true);
      expect(result.value.getParameter('spaced')).toBe('value');
    });

    it('should reject empty parameter key', () => {
      // Act
      const result = context.addParameter('', 'value');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Parameter key cannot be empty');
    });

    it('should reject whitespace-only parameter key', () => {
      // Act
      const result = context.addParameter('   ', 'value');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Parameter key cannot be empty');
    });

    it('should remove parameter successfully', () => {
      // Act
      const result = context.removeParameter('existing');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.hasParameter('existing')).toBe(false);
      expect(result.value.getParameterCount()).toBe(0);
    });

    it('should handle removing non-existent parameter', () => {
      // Act
      const result = context.removeParameter('nonExistent');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.getParameterCount()).toBe(1);
    });

    it('should update parameters by merging', () => {
      // Act
      const result = context.updateParameters({ 
        existing: 'updated',
        new: 'added' 
      });
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.getParameter('existing')).toBe('updated');
      expect(result.value.getParameter('new')).toBe('added');
      expect(result.value.getParameterCount()).toBe(2);
    });

    it('should replace all parameters', () => {
      // Act
      const result = context.replaceParameters({ 
        completely: 'new',
        different: 'params' 
      });
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.hasParameter('existing')).toBe(false);
      expect(result.value.getParameter('completely')).toBe('new');
      expect(result.value.getParameter('different')).toBe('params');
      expect(result.value.getParameterCount()).toBe(2);
    });

    it('should clear all parameters', () => {
      // Act
      const result = context.clearParameters();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.getParameterCount()).toBe(0);
      expect(result.value.getParameterKeys()).toEqual([]);
    });
  });

  describe('parameter access', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const parameters = { 
        string: 'text',
        number: 42,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3]
      };
      const result = ExecutionContext.create('development', parameters, 'test-session');
      context = result.value;
    });

    it('should get parameter with correct type', () => {
      // Act & Assert
      expect(context.getParameter<string>('string')).toBe('text');
      expect(context.getParameter<number>('number')).toBe(42);
      expect(context.getParameter<boolean>('boolean')).toBe(true);
      expect(context.getParameter<object>('object')).toEqual({ nested: 'value' });
      expect(context.getParameter<number[]>('array')).toEqual([1, 2, 3]);
    });

    it('should return undefined for non-existent parameter', () => {
      // Act & Assert
      expect(context.getParameter('nonExistent')).toBeUndefined();
    });

    it('should correctly identify if parameter exists', () => {
      // Act & Assert
      expect(context.hasParameter('string')).toBe(true);
      expect(context.hasParameter('nonExistent')).toBe(false);
    });

    it('should return all parameter keys', () => {
      // Act
      const keys = context.getParameterKeys();
      
      // Assert
      expect(keys).toHaveLength(5);
      expect(keys).toContain('string');
      expect(keys).toContain('number');
      expect(keys).toContain('boolean');
      expect(keys).toContain('object');
      expect(keys).toContain('array');
    });

    it('should return correct parameter count', () => {
      // Act & Assert
      expect(context.getParameterCount()).toBe(5);
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when all properties match', () => {
      // Arrange
      const params = { key: 'value' };
      const context1 = ExecutionContext.create('development', params, 'session-123').value;
      const context2 = ExecutionContext.create('development', params, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(true);
    });

    it('should not be equal when environments differ', () => {
      // Arrange
      const params = { key: 'value' };
      const context1 = ExecutionContext.create('development', params, 'session-123').value;
      const context2 = ExecutionContext.create('production', params, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should not be equal when session IDs differ', () => {
      // Arrange
      const params = { key: 'value' };
      const context1 = ExecutionContext.create('development', params, 'session-123').value;
      const context2 = ExecutionContext.create('development', params, 'session-456').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should not be equal when parameters differ', () => {
      // Arrange
      const context1 = ExecutionContext.create('development', { key: 'value1' }, 'session-123').value;
      const context2 = ExecutionContext.create('development', { key: 'value2' }, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should not be equal when parameter counts differ', () => {
      // Arrange
      const context1 = ExecutionContext.create('development', { key: 'value' }, 'session-123').value;
      const context2 = ExecutionContext.create('development', { key: 'value', extra: 'param' }, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });
  });

  describe('serialization', () => {
    let context: ExecutionContext;
    const testDate = new Date('2024-01-01T00:00:00.000Z');

    beforeEach(() => {
      // Mock Date constructor to return consistent date
      jest.useFakeTimers();
      jest.setSystemTime(testDate);
      
      const result = ExecutionContext.create('development', { key: 'value' }, 'test-session');
      context = result.value;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should convert to object correctly', () => {
      // Act
      const obj = context.toObject();
      
      // Assert
      expect(obj).toEqual({
        environment: 'development',
        parameters: { key: 'value' },
        sessionId: 'test-session',
        createdAt: testDate
      });
    });

    it('should create from object correctly', () => {
      // Arrange
      const obj = {
        environment: 'production' as Environment,
        parameters: { test: 'data' },
        sessionId: 'restored-session',
        createdAt: testDate
      };
      
      // Act
      const result = ExecutionContext.fromObject(obj);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.environment).toBe('production');
      expect(result.value.parameters).toEqual({ test: 'data' });
      expect(result.value.sessionId).toBe('restored-session');
      expect(result.value.createdAt).toEqual(testDate);
    });

    it('should handle string date in fromObject', () => {
      // Arrange
      const obj = {
        environment: 'development' as Environment,
        parameters: {},
        sessionId: 'test-session',
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      
      // Act
      const result = ExecutionContext.fromObject(obj);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.createdAt).toEqual(testDate);
    });

    it('should reject invalid object in fromObject', () => {
      // Act
      const result = ExecutionContext.fromObject(null as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid object provided');
    });

    it('should reject missing properties in fromObject', () => {
      // Arrange
      const obj = {
        environment: 'development' as Environment,
        // Missing sessionId
        parameters: {},
        createdAt: testDate
      };
      
      // Act
      const result = ExecutionContext.fromObject(obj as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Missing required properties: environment and sessionId');
    });

    it('should reject invalid date in fromObject', () => {
      // Arrange
      const obj = {
        environment: 'development' as Environment,
        parameters: {},
        sessionId: 'test-session',
        createdAt: 'invalid-date'
      };
      
      // Act
      const result = ExecutionContext.fromObject(obj);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid createdAt date');
    });
  });

  describe('immutability', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const result = ExecutionContext.create('development', { key: 'value' }, 'test-session');
      context = result.value;
    });

    it('should be immutable after creation', () => {
      // Arrange
      const originalEnv = context.environment;
      const originalParams = context.parameters;
      const originalSession = context.sessionId;
      
      // Act - Try to modify (should have no effect due to readonly and freezing)
      try {
        (context as any)._environment = 'production';
        (context as any)._parameters = {};
        (context as any)._sessionId = 'changed';
      } catch (error) {
        // Expected in strict mode
      }
      
      // Assert - Values should remain unchanged
      expect(context.environment).toBe(originalEnv);
      expect(context.parameters).toBe(originalParams);
      expect(context.sessionId).toBe(originalSession);
    });

    it('should return immutable parameters', () => {
      // Act - Try to modify returned parameters
      const params = context.parameters;
      try {
        (params as any).newKey = 'newValue';
      } catch (error) {
        // Expected - parameters should be frozen
      }
      
      // Assert - Original context should be unchanged
      expect(context.hasParameter('newKey')).toBe(false);
      expect(context.getParameterCount()).toBe(1);
    });

    it('should create new instances when modifying parameters', () => {
      // Act
      const newContext = context.addParameter('newKey', 'newValue').value;
      
      // Assert
      expect(newContext).not.toBe(context);
      expect(context.hasParameter('newKey')).toBe(false);
      expect(newContext.hasParameter('newKey')).toBe(true);
    });
  });

  describe('string representation', () => {
    it('should provide meaningful string representation with parameters', () => {
      // Arrange
      const context = ExecutionContext.create('production', { key1: 'value1', key2: 'value2' }, 'session-456').value;
      
      // Act
      const str = context.toString();
      
      // Assert
      expect(str).toBe('ExecutionContext[production:session-456] with 2 parameters');
    });

    it('should provide meaningful string representation without parameters', () => {
      // Arrange
      const context = ExecutionContext.create('development', {}, 'session-123').value;
      
      // Act
      const str = context.toString();
      
      // Assert
      expect(str).toBe('ExecutionContext[development:session-123] with 0 parameters');
    });
  });

  describe('edge cases', () => {
    it('should handle complex parameter values', () => {
      // Arrange
      const complexParams = {
        nested: { deep: { value: 'test' } },
        array: [{ id: 1 }, { id: 2 }],
        function: () => 'test', // Functions should be preserved
        date: new Date(),
        regex: /test/g,
        null: null,
        undefined: undefined
      };
      
      // Act
      const result = ExecutionContext.create('development', complexParams);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.getParameter('nested')).toEqual(complexParams.nested);
      expect(result.value.getParameter('array')).toEqual(complexParams.array);
      expect(typeof result.value.getParameter('function')).toBe('function');
      expect(result.value.getParameter('date')).toEqual(complexParams.date);
      expect(result.value.getParameter('regex')).toEqual(complexParams.regex);
      expect(result.value.getParameter('null')).toBeNull();
      expect(result.value.getParameter('undefined')).toBeUndefined();
    });

    it('should handle environment case sensitivity', () => {
      // Act & Assert
      expect(ExecutionContext.create('Development')).toBeFailureResult();
      expect(ExecutionContext.create('PRODUCTION')).toBeFailureResult();
      expect(ExecutionContext.create('Test')).toBeFailureResult();
    });

    it('should handle numeric parameter keys as strings', () => {
      // Act
      const context = ExecutionContext.create('development').value;
      const result = context.addParameter('123', 'numeric key');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.hasParameter('123')).toBe(true);
      expect(result.value.getParameter('123')).toBe('numeric key');
    });

    it('should preserve creation time across parameter modifications', () => {
      // Arrange
      const originalContext = ExecutionContext.create('development', { key: 'value' }).value;
      const originalTime = originalContext.createdAt;
      
      // Wait a bit to ensure time would be different
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);
      
      // Act
      const modifiedContext = originalContext.addParameter('new', 'value').value;
      
      // Assert
      expect(modifiedContext.createdAt).toEqual(originalTime);
      
      jest.useRealTimers();
    });
  });
});