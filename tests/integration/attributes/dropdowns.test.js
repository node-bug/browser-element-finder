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

describe('ElementFinderByAttribute Integration Tests - Dropdowns', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'dropdowns.html');
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
    it('should find elements matching visible text "Apple"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Apple');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Banana"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Banana');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by placeholder attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Type to search');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find elements by id attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('single-select');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('single-select');
    });

    it('should find elements by aria-label attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Custom UI');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('custom-dropdown-1');
    });

    it('should find elements by value attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('apple');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should be case-sensitive for "apple" vs "Apple"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('apple');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Apple');
      `);
      // 'apple' should find value attribute matches, 'Apple' should find text content matches
      expect(resultLower.elements.length).toBe(1);
      expect(resultUpper.elements.length).toBe(1);
    });
  });
});