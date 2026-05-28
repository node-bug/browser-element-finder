/**
 * Integration tests for ElementFinderByAttribute
 * Tests finding elements by attribute values containing "Button" in the radio-iframe-table fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByAttribute - Radio iFrame Table Fixture', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'radio-iframe-table.html');
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

  describe('findElementByAttributes - Button text search', () => {
    it('should find elements containing "Button" in text or attributes', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Should find: 2 td elements with "RadioButton 1/2" text + 2 input elements with "radioButton1/2" ids
      expect(mainElements.length).toBe(4);
    });

    it('should find elements by exact text "RadioButton 1:"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('RadioButton 1:');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Should find: 1 td element with text "RadioButton 1:" (input id "radioButton1" doesn't match due to case sensitivity)
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by partial text "RadioButton 1" (substring match)', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('RadioButton 1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Should find: 1 td element with text "RadioButton 1:" (input id "radioButton1" doesn't match due to case sensitivity)
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by exact text "RadioButton 2:"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('RadioButton 2:');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // Should find: 1 td element with text "RadioButton 2:" (input id "radioButton2" doesn't match due to case sensitivity)
      expect(mainElements.length).toBe(1);
    });

    it('should find radio buttons by name attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('radioGroup1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
    });

    it('should find iframes by id attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('myFrame1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find iframes by name attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('frameName2');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementByAttributes - Button text search', () => {
    it('should find 4 elements containing "Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });
  });

  describe('findElements - Button text search', () => {
    it('should find 4 elements containing "Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });
  });

  describe('findProbableElements - Button text search', () => {
    it('should find 4 elements containing "Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements(null, 'Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });
  });
});