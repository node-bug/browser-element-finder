/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in iframes fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Iframes Fixture', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'iframes.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', '..', 'index-by-type.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByType = ElementFinderByType;
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

  describe('findElementByType', () => {
    it('should find all elements with "element" type', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('element');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find checkboxes in main document', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find buttons', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find textboxes', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find links', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dropdowns', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find radios', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
    });

    it('should find navigation elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find images', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find tables', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find lists', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

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