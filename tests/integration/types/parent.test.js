/**
 * Integration tests for ElementFinder parent parameter
 * Tests finding elements within a specific parent element
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinder - Parent Parameter Tests', () => {
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

  describe('findElementsByType with parent parameter', () => {
    it('should find elements within a specific parent element', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByType('button', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Only buttons within buttons-section: btn-standard, btn-submit, btn-role, btn-input
      expect(mainElements.length).toBe(4);
    });

    it('should find buttons within navigation section', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByType('link', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Only links within navigation-section: Home, About, Page 1
      expect(mainElements.length).toBe(3);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByType('textbox', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Only textboxes within textboxes-section: textarea, text, password, email, search, role textbox
      expect(mainElements.length).toBe(6);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByType('textbox', parent);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find checkboxes within checkboxes section', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('checkboxes-section');
        return ElementFinder.findElementsByType('checkbox', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Only checkboxes within checkboxes-section: checkbox-standard, checkbox-role
      expect(mainElements.length).toBe(2);
    });
  });

  describe('findElementsByAttribute with parent parameter', () => {
    it('should find elements within a specific parent element', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Only "Standard Button" within buttons-section
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by id within parent section', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('btn-standard', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('Home', false, parent);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find links within navigation section by text', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByAttribute('Home', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByAttribute('Textarea content', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });
});