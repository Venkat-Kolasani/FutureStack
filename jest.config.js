/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/backend/',
    '<rootDir>/extensions/',
    '<rootDir>/build/',
    '<rootDir>/src/views/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/pages/',
    '<rootDir>/src/views/',
    '<rootDir>/src/App.test.js',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-router-dom$': '<rootDir>/src/testUtils/reactRouterDomMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/testUtils/styleMock.js',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
};
