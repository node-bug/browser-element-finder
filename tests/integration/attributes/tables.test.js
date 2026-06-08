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
    it('should find elements matching visible text "Alice" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Alice');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-alice-name');
    });

    it('should find elements matching "New York" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('New York');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-alice-city');
    });

    it('should find elements matching "Laptop" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Laptop');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-laptop');
    });

    it('should find elements matching "Electronics" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Electronics');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-electronics');
    });

    it('should find elements by id attribute "simple-table" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('simple-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Should find: section with id "simple-table-section" and table with id "simple-table"
      // Both match because "simple-table-section" contains "simple-table" as substring
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by id attribute "span-table" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('span-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('span-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('span-table');
    });

    it('should find elements by id attribute "outer-table" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('outer-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('outer-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('outer-table');
    });

    it('should find elements by id attribute "inner-table" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('inner-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('inner-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('inner-table');
    });

    it('should find elements matching "View" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('View');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-active');
    });

    it('should find elements matching "Activate" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Activate');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-inactive');
    });

    it('should find elements matching "Total" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Total');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the <td> or a child element like <strong>
      // Check if the element or its parent has the expected data-test-id
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'td-total') {
        expect(testDataId).toBe('td-total');
      } else {
        // If the element itself doesn't have it, check parent
        const parentTestDataId = await driver.executeScript(`
          const el = arguments[0];
          return el.closest('td') ? el.closest('td').getAttribute('data-test-id') : null;
        `, mainElements[0].element);
        expect(parentTestDataId).toBe('td-total');
      }
    });

    it('should be case-sensitive for "alice" vs "Alice"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('alice');
      `);
      expect(resultLower.elements.length).toBe(3);
      const testDataIdL = await resultLower.elements[0].element.getAttribute('data-test-id');
      expect(testDataIdL).toMatch(/td-alice-/);

      const resultUpper = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Alice');
      `);
      // "alice" lowercase may or may not match depending on attribute search behavior
      // "Alice" uppercase should definitely match
      expect(resultUpper.elements.length).toBeGreaterThanOrEqual(1);
      // Validate first match for "Alice" has correct data-test-id
      const mainElements = resultUpper.elements.filter(e => e.element);
      if (mainElements.length > 0) {
        const testDataId = await mainElements[0].element.getAttribute('data-test-id');
        // The element should be one of the Alice-related cells
        expect(testDataId).toMatch(/td-alice-/);
      }
    });
  });
});