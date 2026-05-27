/**
 * Integration tests for ElementFinderByAttribute
 * Tests finding elements by attribute values in browser
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByAttribute Integration Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'forms.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', '..', 'index-by-attribute.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByAttribute = ElementFinderByAttribute;
    `);

    await driver.sleep(500);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  describe('findElementByAttributes', () => {
    it('should find elements matching visisble text "Single"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Single');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Field"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Field');
      `);
      expect(result.elements.length).toBe(9);
    });

    it('should find elements by placeholder attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Enter text here');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-single');
    });

    it('should find elements by id attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('text-email');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-email');
    });

    it('should be case-sensitive for "field" vs "Field"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('field');
      `);
      expect(resultLower.elements.length).toBe(2);
      const resultUpper = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Field');
      `);
      expect(resultUpper.elements.length).toBe(9);
    });
  });
});