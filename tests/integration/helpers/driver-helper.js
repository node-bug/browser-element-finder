/**
 * Shared Selenium driver helper for integration tests
 * Ensures proper cleanup of browser processes even when tests fail
 */

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
 *   const { driver } = await createDriverFixture(async (d) => {
 *     await d.get('http://example.com');
 *   });
 *
 * @param {Function} setupFn - Function to run after driver is created
 * @param {Object} browserOptions - Override default Chrome options
 * @returns {Promise<{driver: *}>} Object with the driver instance
 */
function createDriverFixture(setupFn, browserOptions = {}) {
  let driver;

  return {
    async beforeAll() {
      const chrome = await import('selenium-webdriver/chrome.js');
      const { Builder } = await import('selenium-webdriver');

      const options = new chrome.default.Options();
      options.addArguments(
        '--headless',
        '--disable-infobars',
        '--disable-notifications',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      );
      options.excludeSwitches(['enable-automation']);

      // Apply any custom options
      if (browserOptions.args) {
        browserOptions.args.forEach(arg => options.addArguments(arg));
      }

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      if (setupFn) {
        await setupFn(driver);
      }
    },

    afterAll() {
      return safeQuit(driver);
    },

    get driver() {
      return driver;
    },
  };
}

export { safeQuit, createDriverFixture };
