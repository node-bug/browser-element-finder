import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.js'],
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