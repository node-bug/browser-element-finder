/**
 * Shared Selenium driver helper for integration tests
 * Ensures proper cleanup of browser processes even when tests fail
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Safely quit a Selenium driver, handling errors gracefully
 * @param {*} driver - The Selenium WebDriver instance
 */
async function safeQuit(driver) {
  if (driver) {
    try {
      await driver.quit();
    } catch (err) {
      // Driver may already be quit or in an invalid state
      console.warn('Warning: Error quitting driver:', err.message);
    }
  }
}

/**
 * Attempt to create a Chrome driver with retries on transient failures.
 * "session not created / unable to connect to renderer" errors are common
 * when multiple headless Chrome instances launch concurrently under resource
 * pressure. Retry up to `maxRetries` times with a brief back-off.
 */
async function buildDriverWithRetry(chromeOptions, maxRetries = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries + 1) {
        console.warn(`Driver creation attempt ${attempt} failed (${err.message}), retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw lastError;
}

/**
 * Create a beforeAll/afterAll pair that guarantees driver cleanup
 * Usage:
 *   const { driver, setup } = createDriverFixture();
 *   await setup(async (d) => { await d.get('http://example.com'); });
 *
 * @param {Object} options - Configuration options
 * @param {string} options.url - URL to navigate to (file:// or http://)
 * @param {boolean} options.injectFinder - Whether to inject ElementFinder library
 * @param {number} options.sleep - Milliseconds to wait after page load
 * @returns {Object} Object with setup function and driver getter
 */
function createDriverFixture(options = {}) {
  let driver;

  const fixture = {
    async setup(setupFn) {
      console.log('setup() called, options:', Object.keys(options));
      const chromeOptions = new chrome.Options();
      chromeOptions.addArguments(
        '--headless',
        '--disable-infobars',
        '--disable-notifications',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // Reduce resource footprint per instance for better parallelism:
        '--disable-gpu',               // Skip GPU compositing (not needed for headless)
        '--disable-software-rasterizer', // Avoid extra rasterization thread
        '--disable-extensions',        // No extension overhead
        '--disable-background-networking', // No background sync
        '--disable-sync',             // No Chrome sync
        '--metrics-recording-only',   // Disable metrics upload
        '--disable-default-apps',     // No default apps
        '--no-first-run',            // Skip first-run UI
      );
      chromeOptions.excludeSwitches(['enable-automation']);

      driver = await buildDriverWithRetry(chromeOptions);
      console.log('Driver created:', !!driver);

      // Set a reasonable viewport size so elements are fully visible for threshold: 0.6 checks
      await driver.manage().window().setRect({ width: 1280, height: 720 });

      if (options.url) {
        console.log('Navigating to URL...');
        await driver.get(options.url);
        console.log('Navigation complete');
      }

      if (options.injectFinder) {
        const finderPath = join(__dirname, '..', '..', '..', 'index.js');
        console.log('Reading finder from:', finderPath);
        const finderCode = readFileSync(finderPath, 'utf8');
        console.log('Finder code length:', finderCode.length);
        await driver.executeScript(`
          ${finderCode}
          window.ElementFinder = ElementFinder;
        `);
        console.log('Finder injected');
      }

      if (options.injectFinder) {
        // Wait until the injected finder is actually available instead of
        // idling for a fixed duration. This removes dead time from every
        // integration test (the fixture is a synchronous data: URL, so the
        // finder is normally ready immediately).
        await driver.wait(
          () => driver.executeScript('return typeof window.ElementFinder !== "undefined"'),
          10000,
          'ElementFinder was not injected into the page',
        );
      }

      // Optional extra idle buffer after the finder is ready (rarely needed).
      if (options.sleep) {
        await driver.sleep(options.sleep);
      }

      if (setupFn) {
        await setupFn(driver);
      }
    },

    /**
     * Navigate to a URL and re-inject the finder (if configured).
     * Useful when reusing a single driver across multiple pages — executeScript
     * injections do not survive page navigation, so the finder must be
     * re-injected after each driver.get().
     */
    async navigateAndInject(url) {
      await driver.get(url);
      if (options.injectFinder) {
        const finderPath = join(__dirname, '..', '..', '..', 'index.js');
        const finderCode = readFileSync(finderPath, 'utf8');
        await driver.executeScript(`
          ${finderCode}
          window.ElementFinder = ElementFinder;
        `);
        await driver.wait(
          () => driver.executeScript('return typeof window.ElementFinder !== "undefined"'),
          10000,
          'ElementFinder was not injected into the page',
        );
      }
    },

    async teardown() {
      return safeQuit(driver);
    },

    get driver() {
      return driver;
    },

    get url() {
      return options.url;
    },
  };

  return fixture;
}

/**
 * Load an HTML fixture file and return as data URL
 * @param {string} fixturePath - Path to HTML fixture relative to fixtures folder
 * @returns {string} Data URL for the HTML content
 */
function loadFixture(fixturePath) {
  const htmlPath = join(__dirname, '..', '..', 'fixtures', fixturePath);
  const htmlContent = readFileSync(htmlPath, 'utf8');
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
}

export { safeQuit, createDriverFixture, loadFixture };
