/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in tables fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Tables Fixture', () => {
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
      expect(result.elements.length).toBe(267);
    });

    it('should find tables', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
    });

    it('should find rows', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('row');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(120);
    });

    it('should find cells', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('cell');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(240);
    });

    it('should find columns', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('column');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(256);
    });

    it('should find buttons', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
    });

    it('should find headings', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
    });

    it('should find links', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find checkboxes', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('checkbox');
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

    it('should find dropdowns', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByType.findElementByType('dropdown');
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
  });
});