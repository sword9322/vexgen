/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Relax module resolution for Jest (CommonJS runtime)
          moduleResolution: 'node',
          module: 'commonjs',
          target: 'ES2017',
        },
      },
    ],
  },
  moduleNameMapper: {
    // Handle the @/ path alias
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = config;
