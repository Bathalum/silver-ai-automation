const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add custom config for integration tests
const integrationJestConfig = {
  displayName: 'Integration Tests',
  testEnvironment: 'node', // Use node environment for database tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/integration/integration.setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/tests/integration/**/*.integration.test.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/e2e/'
  ],
  collectCoverageFrom: [
    'lib/infrastructure/**/*.{js,jsx,ts,tsx}',
    'lib/domain/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  // Increase timeout for database operations
  testTimeout: 30000,
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  // Setup global variables for integration tests
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs'
      }
    }
  },
  // Environment variables for integration tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    TEST_MODE: 'integration'
  },
  // Verbose output for better debugging
  verbose: true,
  // Force exit after tests complete
  forceExit: true,
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(integrationJestConfig)