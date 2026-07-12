import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests spawn real Chrome instances via Selenium; driver
    // startup can exceed the default 30s under load (parallel workers),
    // causing "Hook timed out" in beforeAll. Give it generous headroom.
    testTimeout: 60000,
    hookTimeout: 120000,
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