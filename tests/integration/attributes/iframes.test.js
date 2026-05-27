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

describe('ElementFinderByAttribute Integration Tests - Iframes', () => {
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

    const finderPath = join(__dirname, '..', '..', '..', 'index-by-attribute.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByAttribute = ElementFinderByAttribute;
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
    it('should find elements matching visible text "Iframe Checkbox"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Iframe Checkbox');
      `);
      expect(result.elements.length).toBe(2);
    });

    it('should find elements by id attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('main-checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('main-checkbox');
    });

    it('should find elements by name attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('mainCheckbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const name = await mainElements[0].element.getAttribute('name');
      expect(name).toBe('mainCheckbox');
    });

    it('should find elements matching "Data URL Button"', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Data URL Button');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by id attribute "iframe-checkbox" (in iframe)', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('iframe-checkbox');
      `);
      // iframe elements are returned without element property (cross-origin restriction)
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(2);
    });

    it('should find elements by name attribute "iframeCheckbox" (in iframe)', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('iframeCheckbox');
      `);
      // iframe elements are returned without element property (cross-origin restriction)
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(2);
    });

    it('should be case-sensitive for "iframe checkbox" vs "Iframe Checkbox"', async () => {
      const resultLower = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('iframe checkbox');
      `);
      const resultUpper = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Iframe Checkbox');
      `);
      expect(resultLower.elements.length).toBe(0);
      expect(resultUpper.elements.length).toBe(2);
    });
  });
});