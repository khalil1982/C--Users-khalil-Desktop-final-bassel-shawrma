/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/dist2/', '/dist3/', '/dist4/'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/services/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/dist2', '<rootDir>/dist3', '<rootDir>/dist4'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
