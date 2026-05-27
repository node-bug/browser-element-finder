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

  describe('findElementByAttributes', () => {
    it('should find elements matching visible text "Home"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Home');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Heading 1"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Heading 1');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Standard Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Standard Button');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by id attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('btn-standard');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
    });

    it('should find elements by aria-label attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-role');
    });

    it('should find elements by alt attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Test Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-standard');
    });

    it('should find elements by role attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements matching "Role Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Button');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role Switch"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role Radio"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Radio');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Combobox"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Combobox');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role Textbox"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Textbox');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role List Item"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role List Item');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role Menu Item"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Menu Item');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Role Heading"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Role Heading');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements matching "Dialog content"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Dialog content');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should be case-sensitive for "home" vs "Home"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('home');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Home');
      `);
      expect(resultLower.elements.length).toBe(0);
      expect(resultUpper.elements.length).toBe(1);
    });

    it('should support exact matching for attributes', async () => {
      // Exact match should find the element
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Standard Button', true);
      `);
      expect(result.elements.length).toBe(1);

      // Partial match should not find with exact=true
      const result2 = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Standard', true);
      `);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Standard', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });

    it('should support exact matching for text content', async () => {
      // Exact match on heading text
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Heading 1', true);
      `);
      expect(result.elements.length).toBe(1);

      // Partial match should not find with exact=true
      const result2 = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Heading', true);
      `);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Heading', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });
  });
});