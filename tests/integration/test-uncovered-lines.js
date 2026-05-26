/**
 * Consolidated Uncovered Lines Tests
 * Tests: ancestor XPath, shadow DOM, SELECT option text, table column expansion
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Uncovered Lines Consolidated Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'uncovered-lines.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    await driver.sleep(1000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  describe('SELECT option text matching', () => {
    it('should find SELECT element by option text using exact match', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('dropdown', 'Opt-Fruit-Apple', true);
        return {
          count: result.elements.length,
          tagName: result.elements[0]?.tagName
        };
      `);
      expect(result.count).toBe(1);
      expect(result.tagName).toBe('select');
    });

    it('should find SELECT element by option text "Banana" using exact match', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('dropdown', 'Opt-Fruit-Banana', true);
        return {
          count: result.elements.length,
          tagName: result.elements[0]?.tagName
        };
      `);
      expect(result.count).toBe(1);
      expect(result.tagName).toBe('select');
    });

    it('should find SELECT element by option text "Cherry" using exact match', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('dropdown', 'Opt-Fruit-Cherry', true);
        return {
          count: result.elements.length,
          tagName: result.elements[0]?.tagName
        };
      `);
      expect(result.count).toBe(1);
      expect(result.tagName).toBe('select');
    });
  });

  describe('Shadow DOM traversal', () => {
    it('should find elements inside shadow DOM', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement(null, 'Shadow DOM Text');
        return {
          count: result.elements.length,
          tagName: result.elements[0]?.tagName
        };
      `);
      expect(result.count).toBe(2);
    });
  });
});