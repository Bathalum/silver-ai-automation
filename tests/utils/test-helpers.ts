/**
 * Test helper utilities and common testing functions
 */

import { Result } from '@/lib/domain/shared/result';

/**
 * Async testing utilities
 */
export class AsyncTestHelpers {
  /**
   * Wait for a condition to become true, with timeout
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.sleep(intervalMs);
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms timeout`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for next tick (useful for Promise resolution)
   */
  static nextTick(): Promise<void> {
    return new Promise(resolve => process.nextTick(resolve));
  }
}

/**
 * Result<T> testing utilities
 */
export class ResultTestHelpers {
  /**
   * Assert that a Result is successful and return the value
   */
  static expectSuccess<T>(result: Result<T>): T {
    if (result.isFailure) {
      throw new Error(`Expected success but got failure: ${result.error}`);
    }
    return result.value;
  }

  /**
   * Assert that a Result is a failure and return the error
   */
  static expectFailure<T>(result: Result<T>): string {
    if (result.isSuccess) {
      throw new Error(`Expected failure but got success with value: ${JSON.stringify(result.value)}`);
    }
    return result.error;
  }

  /**
   * Assert that a Result is successful with a specific value
   */
  static expectSuccessValue<T>(result: Result<T>, expectedValue: T): void {
    const value = this.expectSuccess(result);
    expect(value).toEqual(expectedValue);
  }

  /**
   * Assert that a Result is a failure with a specific error message
   */
  static expectFailureMessage<T>(result: Result<T>, expectedMessage: string): void {
    const error = this.expectFailure(result);
    expect(error).toContain(expectedMessage);
  }
}

/**
 * Mock creation utilities
 */
export class MockHelpers {
  /**
   * Create a mock function with typed return value
   */
  static createMockFunction<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
    return jest.fn() as jest.MockedFunction<T>;
  }

  /**
   * Create a mock object with all methods mocked
   */
  static createMockObject<T>(methods: (keyof T)[]): jest.Mocked<T> {
    const mock = {} as jest.Mocked<T>;
    for (const method of methods) {
      (mock as any)[method] = jest.fn();
    }
    return mock;
  }

  /**
   * Create a resolved promise mock
   */
  static createResolvedMock<T>(value: T): jest.MockedFunction<() => Promise<T>> {
    return jest.fn().mockResolvedValue(value);
  }

  /**
   * Create a rejected promise mock
   */
  static createRejectedMock(error: Error): jest.MockedFunction<() => Promise<never>> {
    return jest.fn().mockRejectedValue(error);
  }
}

/**
 * Validation testing utilities
 */
export class ValidationHelpers {
  /**
   * Test that a function throws with a specific message
   */
  static expectThrowsWithMessage(fn: () => void, expectedMessage: string): void {
    expect(fn).toThrow(expectedMessage);
  }

  /**
   * Test that an async function rejects with a specific message
   */
  static async expectRejectsWithMessage(
    fn: () => Promise<any>, 
    expectedMessage: string
  ): Promise<void> {
    await expect(fn()).rejects.toThrow(expectedMessage);
  }

  /**
   * Test boundary values for numeric inputs
   */
  static testNumericBoundaries(
    createFn: (value: number) => Result<any>,
    validValues: number[],
    invalidValues: number[]
  ): void {
    // Test valid values
    validValues.forEach(value => {
      const result = createFn(value);
      expect(result.isSuccess).toBe(true);
    });

    // Test invalid values
    invalidValues.forEach(value => {
      const result = createFn(value);
      expect(result.isFailure).toBe(true);
    });
  }

  /**
   * Test string length boundaries
   */
  static testStringBoundaries(
    createFn: (value: string) => Result<any>,
    minLength: number,
    maxLength: number
  ): void {
    // Test valid lengths
    const validString = 'a'.repeat(minLength);
    const maxValidString = 'a'.repeat(maxLength);
    
    expect(createFn(validString).isSuccess).toBe(true);
    expect(createFn(maxValidString).isSuccess).toBe(true);

    // Test invalid lengths
    const tooShort = 'a'.repeat(Math.max(0, minLength - 1));
    const tooLong = 'a'.repeat(maxLength + 1);
    
    if (minLength > 0) {
      expect(createFn(tooShort).isFailure).toBe(true);
    }
    expect(createFn(tooLong).isFailure).toBe(true);
  }
}

/**
 * Date and time testing utilities
 */
export class DateTestHelpers {
  /**
   * Create a fixed date for consistent testing
   */
  static createFixedDate(isoString: string = '2024-01-15T10:30:00.000Z'): Date {
    return new Date(isoString);
  }

  /**
   * Mock Date.now to return a fixed timestamp
   */
  static mockDateNow(timestamp: number = Date.now()): jest.SpyInstance {
    return jest.spyOn(Date, 'now').mockReturnValue(timestamp);
  }

  /**
   * Restore Date.now after mocking
   */
  static restoreDateNow(spy: jest.SpyInstance): void {
    spy.mockRestore();
  }

  /**
   * Test that two dates are approximately equal (within tolerance)
   */
  static expectDatesNear(actual: Date, expected: Date, toleranceMs: number = 1000): void {
    const diff = Math.abs(actual.getTime() - expected.getTime());
    expect(diff).toBeLessThanOrEqual(toleranceMs);
  }
}

/**
 * UUID testing utilities
 */
export class UuidTestHelpers {
  private static uuidCounter = 0;

  /**
   * Generate a test UUID with incremental counter
   */
  static generateTestUuid(): string {
    this.uuidCounter++;
    return `test-uuid-${this.uuidCounter.toString().padStart(8, '0')}-0000-0000-0000-000000000000`;
  }

  /**
   * Reset UUID counter for consistent test runs
   */
  static resetCounter(): void {
    this.uuidCounter = 0;
  }

  /**
   * Mock crypto.randomUUID to return predictable UUIDs
   */
  static mockRandomUuid(): jest.SpyInstance {
    return jest.spyOn(global.crypto, 'randomUUID')
      .mockImplementation(() => this.generateTestUuid());
  }

  /**
   * Validate UUID format
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Console testing utilities
 */
export class ConsoleTestHelpers {
  /**
   * Capture console output during test execution
   */
  static captureConsole(): {
    logs: string[];
    errors: string[];
    warnings: string[];
    restore: () => void;
  } {
    const logs: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    console.warn = (...args) => warnings.push(args.join(' '));
    
    return {
      logs,
      errors,
      warnings,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceHelpers {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    return {
      result,
      timeMs: end - start
    };
  }

  /**
   * Assert that a function executes within a time limit
   */
  static async expectExecutionTime<T>(
    fn: () => T | Promise<T>,
    maxTimeMs: number
  ): Promise<T> {
    const { result, timeMs } = await this.measureTime(fn);
    expect(timeMs).toBeLessThanOrEqual(maxTimeMs);
    return result;
  }
}

/**
 * Error testing utilities
 */
export class ErrorHelpers {
  /**
   * Create a standardized test error
   */
  static createTestError(message: string = 'Test error'): Error {
    return new Error(message);
  }

  /**
   * Test error boundary conditions
   */
  static testErrorHandling<T>(
    fn: (...args: any[]) => T,
    errorInputs: any[][],
    expectedErrors: string[]
  ): void {
    errorInputs.forEach((inputs, index) => {
      const expectedError = expectedErrors[index];
      expect(() => fn(...inputs)).toThrow(expectedError);
    });
  }
}