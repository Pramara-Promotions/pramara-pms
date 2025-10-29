// api/jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: '../coverage/api',
  collectCoverageFrom: [
    'routes/**/*.js',
    'lib/**/*.js',
    'middleware/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
