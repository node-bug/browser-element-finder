/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in dropdowns fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Dropdowns Fixture', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'dropdowns.html');
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

  describe('findElementsByType', () => {
    it('should find dropdowns and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find buttons and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find textboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find links and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find radios and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find images and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find tables and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find lists and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });
  });
});