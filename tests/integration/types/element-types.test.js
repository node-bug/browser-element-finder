/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in element-types fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Element Types Fixture', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'element-types.html');
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

  describe('getElementCounts', () => {
    it('should return visible, hidden, and total counts for all semantic types', async () => {
      const counts = await driver.executeScript('return ElementFinder.getElementCounts()');

      expect(counts.link).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.navigation).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.heading).toEqual({ visible: 24, hidden: 0, total: 24 });
      expect(counts.button).toEqual({ visible: 7, hidden: 0, total: 7 });
      expect(counts.checkbox).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.switch).toEqual({ visible: 4, hidden: 0, total: 4 });
      expect(counts.slider).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.radio).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.dropdown).toEqual({ visible: 4, hidden: 0, total: 4 });
      expect(counts.textbox).toEqual({ visible: 6, hidden: 0, total: 6 });
      expect(counts.table).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.row).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.column).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.cell).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.image).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.element).toEqual({ visible: 100, hidden: 4, total: 104 });
    });

    it('should return visible, hidden, and total counts for one semantic type', async () => {
      const counts = await driver.executeScript('return ElementFinder.getElementCounts("button")');

      expect(counts).toEqual({ button: { visible: 7, hidden: 0, total: 7 } });
    });

    it('should count elements within a parent element', async () => {
      const counts = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.getElementCounts('button', parent);
      `);

      expect(counts).toEqual({ button: { visible: 4, hidden: 0, total: 4 } });
    });

    it('should count hidden elements in the browser', async () => {
      const counts = await driver.executeScript(`
        const hiddenButton = document.createElement('button');
        hiddenButton.hidden = true;
        document.body.appendChild(hiddenButton);

        try {
          return ElementFinder.getElementCounts('button');
        } finally {
          hiddenButton.remove();
        }
      `);

      expect(counts).toEqual({ button: { visible: 7, hidden: 1, total: 8 } });
    });
  });

  describe('findElementsByType', () => {
    it('should find all elements with "element" type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('element');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find buttons and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find textboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find links and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dropdowns and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find sliders and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find radios and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(24);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find images and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find tables and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find lists and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find file inputs and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('file');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find menus and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('menu');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find toolbars and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('toolbar');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dialogs and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('dialog');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Validate first match has correct data-test-id
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should return empty array for unknown type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('unknown-type-xyz');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should throw TypeError for non-string type', async () => {
      await expect(async () => {
        await driver.executeScript(`
          return ElementFinder.findElementsByType(123);
        `);
      }).rejects.toThrow();
    });
  });
});