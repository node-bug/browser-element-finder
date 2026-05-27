/**
 * Integration tests for ElementFinderByAttribute
 * Tests finding elements by attribute values in tables fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByAttribute Integration Tests - Tables', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'tables.html');
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
    it('should find elements matching visible text "Alice"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Alice');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "New York"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('New York');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Laptop"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Laptop');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Electronics"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Electronics');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by id attribute "simple-table"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('simple-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('simple-table');
    });

    it('should find elements by id attribute "span-table"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('span-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('span-table');
    });

    it('should find elements by id attribute "outer-table"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('outer-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('outer-table');
    });

    it('should find elements by id attribute "inner-table"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('inner-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('inner-table');
    });

    it('should find elements matching "View"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('View');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Activate"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Activate');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Total"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Total');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should be case-sensitive for "alice" vs "Alice"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('alice');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Alice');
      `);
      expect(resultLower.elements.length).toBe(0);
      expect(resultUpper.elements.length).toBe(1);
    });
  });
});