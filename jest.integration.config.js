const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testEnvironment: 'jsdom',
  
  // Integration test specific patterns
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.integration.test.ts'
  ],
  
  // NO MOCKING for integration tests
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  
  // Don't transform node_modules for integration tests
  transformIgnorePatterns: [],
  
  // Module name mapping (but NO mocks)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
  },
  
  // Timeout for integration tests
  testTimeout: 120000,
  
  // Run tests serially for database operations
  maxWorkers: 1,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)