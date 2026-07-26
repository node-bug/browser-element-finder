import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests spawn real Chrome instances via Selenium; driver
    // startup can exceed the default 30s under load (parallel workers),
    // causing "Hook timed out" in beforeAll. Give it generous headroom.
    testTimeout: 60000,
    hookTimeout: 120000,
    include: ['tests/**/*.js'],
    exclude: ['tests/integration/helpers/**', 'tests/helpers/**'],
    // Run integration tests with moderate parallelism.
    // Bounding box normalization rounds to integers, absorbing sub-pixel drift.
    // The baseline parity suite now reuses a single driver across fixtures,
    // reducing per-file Chrome spawn count from 21 to 1.
    // 3 workers is the stable sweet spot on typical CI/dev machines: enough
    // parallelism for meaningful speedup, few enough Chrome instances to avoid
    // resource contention (renderer crashes, hook timeouts).
    maxWorkers: 3,
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