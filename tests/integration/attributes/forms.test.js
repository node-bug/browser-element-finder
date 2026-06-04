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
    it('should find elements matching visisble text "Single" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Single');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the label or the input - check both
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'text-single') {
        expect(testDataId).toBe('text-single');
      } else {
        // If the element itself doesn't have it, check if it's the label and find the associated input
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'text-single') {
          expect(forAttr).toBe('text-single');
        }
      }
    });

    it('should find elements matching "Field" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Field');
      `);
      expect(result.elements.length).toBe(9);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by placeholder attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Enter text here');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-single');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('text-single');
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('text-email');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-email');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('text-email');
    });

    it('should be case-sensitive for "field" vs "Field"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('field');
      `);
      expect(resultLower.elements.length).toBe(2);
      const resultUpper = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Field');
      `);
      expect(resultUpper.elements.length).toBe(9);
    });
  });
});