/* eslint-disable @typescript-eslint/no-var-requires */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(isows|@supabase/realtime-js)/)'],
  collectCoverageFrom: [
    // Application code
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',

    // Exclude test files themselves
    '!**/__tests__/**',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!**/*.spec.{js,jsx,ts,tsx}',
    '!**/test-utils.ts',

    // Exclude configuration and build files
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
    '!**/jest.setup.js',
    '!**/next.config.mjs',
    '!**/tailwind.config.ts',
    '!**/postcss.config.mjs',
    '!**/eslint.config.mjs',
    '!**/tsconfig.json',
    '!**/package.json',
    '!**/pnpm-lock.yaml',
    '!**/vercel.json',
    '!**/sentry.*.config.ts',
    '!**/supabase/**',
    '!**/public/**',
    '!**/styles/**',
    '!**/memory-bank/**',
    '!**/PADDLE_SETUP.md',
    '!**/README.md',
    '!**/TESTING.md',
    '!**/SENTRY_PROFILING.md',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '.*test-utils\\.ts$',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
