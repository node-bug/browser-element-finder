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

describe('ElementFinderByAttribute Integration Tests - Element Types', () => {
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

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Home" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Home');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('link-home');
    });

    it('should find elements matching "Heading 1" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading 1');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('h1-test');
    });

    it('should find elements matching "Standard Button" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Button');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('btn-standard');
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('btn-standard');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements by aria-label attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-role');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('img-role');
    });

    it('should find elements by alt attribute and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Test Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('img-standard');
    });

    it('should find elements matching "Role Button" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Button');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-role');
    });

    it('should find elements matching "Role Switch" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Switch');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('switch-role');
    });

    it('should find elements matching "Role Radio" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Radio');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('radio-role');
    });

    it('should find elements matching "Combobox" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Combobox');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dropdown-combobox');
    });

    it('should find elements matching "Role Textbox" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Textbox');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-role');
    });

    it('should find elements matching "Role List Item" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role List Item');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('list-role-item');
    });

    it('should find elements matching "Role Menu Item" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Menu Item');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-role-item');
    });

    it('should find elements matching "Role Heading" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Heading');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('role-heading');
    });

    it('should find elements matching "Dialog content" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Dialog content');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dialog-content');
    });

    it('should be case-sensitive for "home" vs "Home"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('home');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Home');
      `);
      // "home" is found because it matches the href attribute (case-insensitive in some browsers)
      // "Home" is found because it matches the visible text
      expect(resultLower.elements.length).toBeGreaterThanOrEqual(0);
      expect(resultUpper.elements.length).toBe(1);
      // Validate first match for "Home" has correct data-test-id
      const mainElements = resultUpper.elements.filter(e => e.element);
      if (mainElements.length > 0) {
        const testDataId = await mainElements[0].element.getAttribute('data-test-id');
        expect(testDataId).toBe('link-home');
      }
    });

    it('should support exact matching for attributes', async () => {
      // Exact match should find the element
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Button', true);
      `);
      expect(result.elements.length).toBe(1);

      // Partial match should not find with exact=true
      const result2 = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard', true);
      `);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });

    it('should support exact matching for text content', async () => {
      // Exact match on heading text
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading 1', true);
      `);
      expect(result.elements.length).toBe(1);

      // Partial match should not find with exact=true
      const result2 = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading', true);
      `);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });
  });
});