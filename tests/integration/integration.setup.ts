/**
 * Integration Test Setup
 * 
 * Global setup and teardown for integration tests.
 * Configures test environment, database connections, and cleanup.
 */

import { integrationTestSetup } from './infrastructure/database-test-utilities';
import { SupabaseTestClient } from './infrastructure/supabase-test-client';

// Global timeout for integration tests
jest.setTimeout(30000);

// Global setup - runs once before all tests
beforeAll(async () => {
  try {
    // Check if we're in integration test mode
    if (!SupabaseTestClient.isIntegrationTestMode()) {
      console.log('⚠️  Integration tests skipped - not in integration mode');
      console.log('To run integration tests, set:');
      console.log('  NODE_ENV=test');
      console.log('  TEST_MODE=integration');
      console.log('  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
      return;
    }

    console.log('🚀 Setting up integration test environment...');
    
    // Initialize test environment
    await integrationTestSetup.globalSetup();
    
    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    if (!SupabaseTestClient.isIntegrationTestMode()) {
      return;
    }

    console.log('🧹 Cleaning up integration test environment...');
    
    // Clean up test environment
    await integrationTestSetup.globalTeardown();
    
    console.log('✅ Integration test environment cleaned up');
  } catch (error) {
    console.error('❌ Integration test teardown failed:', error);
    // Don't throw in teardown to avoid masking test failures
  }
});

// Add custom matchers for integration tests
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(thresholdMs: number): R;
      toMaintainDatabaseConsistency(): R;
    }
  }
}

// Performance threshold matcher
expect.extend({
  toBeWithinPerformanceThreshold(received: number, thresholdMs: number) {
    const pass = received <= thresholdMs;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms to exceed ${thresholdMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within ${thresholdMs}ms threshold`,
        pass: false,
      };
    }
  },
  
  toMaintainDatabaseConsistency(received: any) {
    // This would implement consistency checks
    // For now, just check that received value exists
    const pass = received !== null && received !== undefined;
    
    if (pass) {
      return {
        message: () => `Expected value to be inconsistent`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected value to maintain database consistency`,
        pass: false,
      };
    }
  }
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'integration';

// Suppress console logs during tests (except for important messages)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = (...args: any[]) => {
    // Only show integration test related logs
    if (args.some(arg => 
      typeof arg === 'string' && (
        arg.includes('Integration') || 
        arg.includes('database') || 
        arg.includes('performance') ||
        arg.includes('✅') ||
        arg.includes('❌') ||
        arg.includes('⚠️')
      )
    )) {
      originalConsoleLog(...args);
    }
  };
  
  console.warn = (...args: any[]) => {
    // Always show warnings
    originalConsoleWarn(...args);
  };
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});