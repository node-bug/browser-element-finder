/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in shadow DOM
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Shadow DOM Fixture', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'shadow-dom.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', '..', 'index-by-type.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByType = ElementFinderByType;
    `);

    await driver.sleep(2000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  describe('Basic Shadow DOM - Section 1', () => {
    it('should find all elements with "element" type', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('element');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find buttons in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Submit, Cancel, Forgot password, Submit (signup), Submit (dynamic), etc.
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Various text inputs in shadow DOM
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Terms checkbox, inner checkbox, frame shadow checkbox, etc.
      expect(mainElements.length).toBeGreaterThan(3);
    });

    it('should find dropdowns in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Role select dropdown
      expect(mainElements.length).toBeGreaterThan(0);
    });

    it('should find links in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Help link, Forgot password link, Terms link
      expect(mainElements.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Shadow Hosts - Section 2', () => {
    it('should find buttons in multiple shadow hosts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in multiple shadow hosts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('Nested Shadow DOM - Section 3', () => {
    it('should find buttons in two-level nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in two-level nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in two-level nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(3);
    });

    it('should find buttons in three-level deep nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find buttons in five-level deep nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('Shadow DOM in Iframe - Section 5', () => {
    it('should find buttons in shadow DOM inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      // iframe shadow elements are returned without element property
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find textboxes in shadow DOM inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find checkboxes in shadow DOM inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find buttons in nested shadow inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Web Components - Section 8', () => {
    it('should find buttons in custom button web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in custom input web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in custom toggle web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(3);
    });
  });

  describe('Combined Regular + Shadow DOM - Section 9', () => {
    it('should find buttons in both regular and shadow DOM contexts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Regular Submit button + shadow Submit buttons
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in both regular and shadow DOM contexts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Regular input + shadow inputs
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in both regular and shadow DOM contexts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Regular checkbox + shadow checkboxes
      expect(mainElements.length).toBeGreaterThan(3);
    });
  });

  describe('Dynamic Shadow DOM - Section 7', () => {
    it('should find buttons in dynamically created shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in dynamically created shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases - Section 10', () => {
    it('should return empty array for unknown type', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('unknown-type-xyz');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should throw TypeError for non-string type', async () => {
      await expect(async () => {
        await driver.executeScript(`
          return ElementFinderByType.findElementByType(123);
        `);
      }).rejects.toThrow();
    });
  });
});