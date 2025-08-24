/**
 * Unit tests for ExecutionContext value object
 * Tests execution environment management, parameters, and session tracking
 */

import { ExecutionContext, Environment } from '@/lib/domain/value-objects/execution-context';

describe('ExecutionContext', () => {
  describe('creation', () => {
    it('should create execution context with valid environment', () => {
      // Act
      const result = ExecutionContext.create('production');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const context = result.value;
      expect(context.environment).toBe('production');
      expect(context.parameters).toEqual({});
      expect(context.sessionId).toBeDefined();
      expect(context.sessionId).toMatch(/^exec-session-[\w-]+$/);
      expect(context.createdAt).toBeInstanceOf(Date);
    });

    it('should create context with parameters', () => {
      // Arrange
      const params = { param1: 'value1', param2: 42, param3: true };
      
      // Act
      const result = ExecutionContext.create('development', params);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const context = result.value;
      expect(context.parameters).toEqual(params);
    });

    it('should create context with custom session ID', () => {
      // Act
      const result = ExecutionContext.create('test', {}, 'custom-session-123');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const context = result.value;
      expect(context.sessionId).toBe('custom-session-123');
    });

    it('should reject empty environment', () => {
      // Act
      const result = ExecutionContext.create('');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Environment cannot be empty');
    });

    it('should reject whitespace-only environment', () => {
      // Act
      const result = ExecutionContext.create('   ');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Environment cannot be empty');
    });

    it('should reject empty session ID', () => {
      // Act
      const result = ExecutionContext.create('production', {}, '');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Session ID cannot be empty');
    });

    it('should reject whitespace-only session ID', () => {
      // Act
      const result = ExecutionContext.create('production', {}, '   ');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Session ID cannot be empty');
    });
  });

  describe('parameter management', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const result = ExecutionContext.create('test', { initial: 'value' });
      context = result.value;
    });

    it('should add parameter successfully', () => {
      // Act
      const result = context.addParameter('newParam', 'newValue');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual({
        initial: 'value',
        newParam: 'newValue'
      });
    });

    it('should add numeric parameter', () => {
      // Act
      const result = context.addParameter('count', 42);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters.count).toBe(42);
    });

    it('should add boolean parameter', () => {
      // Act
      const result = context.addParameter('enabled', true);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters.enabled).toBe(true);
    });

    it('should add object parameter', () => {
      // Arrange
      const objectParam = { nested: { value: 'test' }, array: [1, 2, 3] };
      
      // Act
      const result = context.addParameter('config', objectParam);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters.config).toEqual(objectParam);
    });

    it('should reject empty parameter key', () => {
      // Act
      const result = context.addParameter('', 'value');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Parameter key cannot be empty');
    });

    it('should reject whitespace-only parameter key', () => {
      // Act
      const result = context.addParameter('   ', 'value');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Parameter key cannot be empty');
    });

    it('should replace existing parameter', () => {
      // Act
      const result = context.addParameter('initial', 'replacedValue');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters.initial).toBe('replacedValue');
    });

    it('should remove parameter successfully', () => {
      // Act
      const result = context.removeParameter('initial');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual({});
    });

    it('should handle removing non-existent parameter', () => {
      // Act
      const result = context.removeParameter('nonExistent');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual({ initial: 'value' });
    });

    it('should update multiple parameters at once', () => {
      // Arrange
      const updates = { param1: 'value1', param2: 42, param3: true };
      
      // Act
      const result = context.updateParameters(updates);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual({
        initial: 'value',
        param1: 'value1',
        param2: 42,
        param3: true
      });
    });

    it('should replace all parameters when updating', () => {
      // Arrange
      const newParams = { completely: 'new', set: 'of', params: 123 };
      
      // Act
      const result = context.replaceParameters(newParams);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual(newParams);
    });

    it('should clear all parameters', () => {
      // Act
      const result = context.clearParameters();
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const updatedContext = result.value;
      expect(updatedContext.parameters).toEqual({});
    });
  });

  describe('parameter retrieval', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const result = ExecutionContext.create('test', {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        objectParam: { nested: 'value' }
      });
      context = result.value;
    });

    it('should get existing parameter', () => {
      // Act
      const result = context.getParameter('stringParam');
      
      // Assert
      expect(result).toBe('test');
    });

    it('should return undefined for non-existent parameter', () => {
      // Act
      const result = context.getParameter('nonExistent');
      
      // Assert
      expect(result).toBeUndefined();
    });

    it('should check if parameter exists', () => {
      // Act & Assert
      expect(context.hasParameter('stringParam')).toBe(true);
      expect(context.hasParameter('nonExistent')).toBe(false);
    });

    it('should get all parameter keys', () => {
      // Act
      const keys = context.getParameterKeys();
      
      // Assert
      expect(keys.sort()).toEqual(['booleanParam', 'numberParam', 'objectParam', 'stringParam']);
    });

    it('should count parameters', () => {
      // Act
      const count = context.getParameterCount();
      
      // Assert
      expect(count).toBe(4);
    });
  });

  describe('immutability', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      const result = ExecutionContext.create('test', { param: 'value' });
      context = result.value;
    });

    it('should return new instance when adding parameter', () => {
      // Act
      const result = context.addParameter('newParam', 'newValue');
      const newContext = result.value;
      
      // Assert
      expect(newContext).not.toBe(context);
      expect(context.parameters).toEqual({ param: 'value' });
      expect(newContext.parameters).toEqual({ param: 'value', newParam: 'newValue' });
    });

    it('should return new instance when removing parameter', () => {
      // Act
      const result = context.removeParameter('param');
      const newContext = result.value;
      
      // Assert
      expect(newContext).not.toBe(context);
      expect(context.parameters).toEqual({ param: 'value' });
      expect(newContext.parameters).toEqual({});
    });

    it('should prevent direct modification of parameters', () => {
      // Act & Assert
      expect(() => {
        (context.parameters as any).directModification = 'should-not-work';
      }).toThrow();
    });

    it('should preserve original context when updates fail', () => {
      // Arrange
      const originalParams = { ...context.parameters };
      
      // Act - Try invalid operation
      const result = context.addParameter('', 'invalid');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(context.parameters).toEqual(originalParams);
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when all properties match', () => {
      // Arrange
      const params = { param1: 'value1', param2: 42 };
      const context1 = ExecutionContext.create('production', params, 'session-123').value;
      const context2 = ExecutionContext.create('production', params, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(true);
    });

    it('should not be equal when environments differ', () => {
      // Arrange
      const params = { param: 'value' };
      const context1 = ExecutionContext.create('production', params, 'session-123').value;
      const context2 = ExecutionContext.create('development', params, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should not be equal when session IDs differ', () => {
      // Arrange
      const params = { param: 'value' };
      const context1 = ExecutionContext.create('production', params, 'session-123').value;
      const context2 = ExecutionContext.create('production', params, 'session-456').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should not be equal when parameters differ', () => {
      // Arrange
      const context1 = ExecutionContext.create('production', { param: 'value1' }, 'session-123').value;
      const context2 = ExecutionContext.create('production', { param: 'value2' }, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });

    it('should handle comparison with different parameter counts', () => {
      // Arrange
      const context1 = ExecutionContext.create('production', { param1: 'value' }, 'session-123').value;
      const context2 = ExecutionContext.create('production', { param1: 'value', param2: 'extra' }, 'session-123').value;
      
      // Act & Assert
      expect(context1.equals(context2)).toBe(false);
    });
  });

  describe('string representation', () => {
    it('should provide meaningful string representation', () => {
      // Arrange
      const context = ExecutionContext.create('production', { param: 'value' }, 'session-123').value;
      
      // Act
      const str = context.toString();
      
      // Assert
      expect(str).toContain('production');
      expect(str).toContain('session-123');
      expect(str).toContain('1 parameter');
    });

    it('should handle multiple parameters in string representation', () => {
      // Arrange
      const context = ExecutionContext.create('test', { param1: 'value1', param2: 'value2' }).value;
      
      // Act
      const str = context.toString();
      
      // Assert
      expect(str).toContain('2 parameters');
    });

    it('should handle no parameters in string representation', () => {
      // Arrange
      const context = ExecutionContext.create('test').value;
      
      // Act
      const str = context.toString();
      
      // Assert
      expect(str).toContain('0 parameters');
    });
  });

  describe('serialization', () => {
    it('should convert to object representation', () => {
      // Arrange
      const params = { param1: 'value1', param2: 42 };
      const context = ExecutionContext.create('production', params, 'session-123').value;
      
      // Act
      const obj = context.toObject();
      
      // Assert
      expect(obj).toEqual({
        environment: 'production',
        sessionId: 'session-123',
        parameters: params,
        createdAt: context.createdAt
      });
    });

    it('should create from object representation', () => {
      // Arrange
      const obj = {
        environment: 'test' as Environment,
        sessionId: 'session-456',
        parameters: { param: 'value' },
        createdAt: new Date()
      };
      
      // Act
      const result = ExecutionContext.fromObject(obj);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      const context = result.value;
      expect(context.environment).toBe('test');
      expect(context.sessionId).toBe('session-456');
      expect(context.parameters).toEqual({ param: 'value' });
      expect(context.createdAt).toBe(obj.createdAt);
    });

    it('should reject invalid object during deserialization', () => {
      // Arrange
      const invalidObj = {
        environment: '',
        sessionId: 'session-123',
        parameters: {},
        createdAt: new Date()
      };
      
      // Act
      const result = ExecutionContext.fromObject(invalidObj);
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Environment cannot be empty');
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined parameter values', () => {
      // Arrange
      const context = ExecutionContext.create('test').value;
      
      // Act
      const result1 = context.addParameter('nullParam', null);
      const result2 = result1.value.addParameter('undefinedParam', undefined);
      
      // Assert
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result2.value.parameters.nullParam).toBeNull();
      expect(result2.value.parameters.undefinedParam).toBeUndefined();
    });

    it('should handle very large parameter objects', () => {
      // Arrange
      const context = ExecutionContext.create('test').value;
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      
      // Act
      const result = context.addParameter('largeParam', largeObject);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(Object.keys(result.value.parameters.largeParam)).toHaveLength(1000);
    });

    it('should handle unicode in parameter keys and values', () => {
      // Arrange
      const context = ExecutionContext.create('test').value;
      
      // Act
      const result = context.addParameter('参数', '测试值 🎉');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.parameters['参数']).toBe('测试值 🎉');
    });

    it('should handle special characters in session ID', () => {
      // Act
      const result = ExecutionContext.create('test', {}, 'session-123_abc.def');
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.sessionId).toBe('session-123_abc.def');
    });
  });
});