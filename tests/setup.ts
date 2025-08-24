/**
 * Global test setup and configuration
 * Runs before all tests to configure the testing environment
 */

// Mock console methods to reduce test noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Configure timezone for consistent date testing
process.env.TZ = 'UTC';

// Mock crypto.randomUUID for consistent UUID generation in tests
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => {
      // Generate valid UUID v4 format for testing
      const counter = (++uuidCounter).toString(16).padStart(8, '0');
      return `${counter.substring(0, 8)}-${counter.substring(0, 4)}-4${counter.substring(0, 3)}-8${counter.substring(0, 3)}-${counter.substring(0, 12).padEnd(12, '0')}`;
    })
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidResult(): R;
      toBeFailureResult(): R;
      toHaveErrorMessage(expected: string): R;
    }
  }
}

// Custom Jest matchers for Result<T> pattern
expect.extend({
  toBeValidResult(received) {
    const pass = received && typeof received.isSuccess === 'boolean' && received.isSuccess === true;
    return {
      message: () => `Expected ${received} to be a successful Result`,
      pass,
    };
  },
  
  toBeFailureResult(received) {
    const pass = received && typeof received.isFailure === 'boolean' && received.isFailure === true;
    return {
      message: () => `Expected ${received} to be a failed Result`,
      pass,
    };
  },
  
  toHaveErrorMessage(received, expected) {
    const pass = received && received.isFailure && received.error === expected;
    return {
      message: () => `Expected Result to have error message "${expected}", but got "${received?.error}"`,
      pass,
    };
  },
});

export {};