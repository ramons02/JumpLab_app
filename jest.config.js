module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/helpers/',
    '<rootDir>/tests/setup.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
