/**
 * Test Google Doodle Element Finder
 * Tests finding and highlighting elements by text on Google Doodle page
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Google Doodle Element Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get('https://doodles.google/doodle/122nd-birthday-of-charlie-chaplin/');

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    await driver.sleep(2000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  it('should find element with text "Doodle"', async () => {
    const elementDetails = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Doodle');
      if (result.elements.length === 0) {
        return { found: false };
      }
      return {
        found: true,
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.substring(0, 100),
          x: Math.round(e.boundingBox.x),
          y: Math.round(e.boundingBox.y),
          width: Math.round(e.boundingBox.width),
          height: Math.round(e.boundingBox.height)
        }))
      };
    `);

    expect(elementDetails.found).toBe(true);
    expect(elementDetails.count).toBeGreaterThan(0);
  });

  it('should highlight the element', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Doodle');
      if (result.elements.length > 0) {
        ElementFinder.highlight(result.elements.map(e => e.element), 'orange', 3);
      }
    `);
  });
});