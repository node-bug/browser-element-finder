/**
 * Shared Selenium driver helper for integration tests
 * Ensures proper cleanup of browser processes even when tests fail
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(fileURLToPath(import.meta.url), '..', '..');

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

  return {
    async setup(setupFn) {
      const chromeOptions = new chrome.Options();
      chromeOptions.addArguments(
        '--headless',
        '--disable-infobars',
        '--disable-notifications',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      );
      chromeOptions.excludeSwitches(['enable-automation']);

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();

      if (options.url) {
        await driver.get(options.url);
      }

      if (options.injectFinder) {
        const finderPath = join(__dirname, '..', '..', 'index.js');
        const finderCode = readFileSync(finderPath, 'utf8');
        await driver.executeScript(`
          ${finderCode}
          window.ElementFinder = ElementFinder;
        `);
      }

      if (options.sleep) {
        await driver.sleep(options.sleep);
      }

      if (setupFn) {
        await setupFn(driver);
      }
    },

    async teardown() {
      return safeQuit(driver);
    },

    get driver() {
      return driver;
    },
  };
}

/**
 * Load an HTML fixture file and return as data URL
 * @param {string} fixturePath - Path to HTML fixture relative to fixtures folder
 * @returns {string} Data URL for the HTML content
 */
function loadFixture(fixturePath) {
  const __currentDir = join(__filename, '..');
  const htmlPath = join(__currentDir, 'fixtures', fixturePath);
  const htmlContent = readFileSync(htmlPath, 'utf8');
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
}

export { safeQuit, createDriverFixture, loadFixture };
