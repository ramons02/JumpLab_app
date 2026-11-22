module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/ferramentas/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/helpers/',
    '<rootDir>/tests/setup.ts',
  ],
  coverageThreshold: {
    './src/utils/biomechanics.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Desenha com SVG e gradiente nativos; nos testes, o mock expõe as props recebidas (spec 009).
    '^react-native-gifted-charts$': '<rootDir>/tests/helpers/mockGiftedCharts.tsx',
  },
};
