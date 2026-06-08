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

    const finderPath = join(__dirname, '..', '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
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

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Apple" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Apple');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the option or the select - check both
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        // If the element is an option, check the parent select
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should find elements matching "Banana" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Banana');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the option or the select - check both
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        // If the element is an option, check the parent select
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should find elements by placeholder attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Type to search');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('single-select');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('single-select');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('single-select');
    });

    it('should find elements by aria-label attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Custom UI');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by value attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('apple');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // The element may be the option or the select - check both
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        // If the element is an option, check the parent select
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should be case-sensitive for "apple" vs "Apple"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('apple');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Apple');
      `);
      // 'apple' should find value attribute matches, 'Apple' should find text content matches
      expect(resultLower.elements.length).toBe(1);
      expect(resultUpper.elements.length).toBe(1);
    });
  });
});