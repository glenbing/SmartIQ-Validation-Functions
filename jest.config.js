module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'ValidateNZBankAccount/**/*.ts',
    'ValidateNZIRDNumber/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**'
  ]
};
