import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.js'],
    exclude: ['tests/integration/helpers/**'],
    // Run integration tests serially to avoid spawning too many Chrome processes
    // and to ensure proper cleanup between test files
    maxWorkers: 2,
    // Forcefully terminate workers after tests complete to prevent orphaned processes
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['tests/**', 'node_modules/**'],
      // Note: index.js is browser-injected code executed via Selenium's executeScript
      // Coverage for browser-injected code requires browser-based tools like Istanbul
      // or running tests in a browser environment. The src/element-finder.js module
      // provides the same functionality for Node.js testing with coverage.
    },
  },
});