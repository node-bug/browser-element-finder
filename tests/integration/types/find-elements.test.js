/**
 * Integration tests for findElements function - combined type and attribute search
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinder - findElements combined search', () => {
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

  describe('findElements with type only', () => {
    it('should find all buttons when type is "button" and text is null', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('button', null);
      `);
      const mainElements = result.elements.filter(e => e.element);
      // buttons-section (4) + menu-section (1) + toolbar-section (1) + switch-section (1) = 7
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all links when type is "link" and text is undefined', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('link', undefined);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all elements when type is null', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, '');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements by id when type is null and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'btn-standard');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find button with matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('button', 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find link with matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('link', 'Home');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const href = await mainElements[0].element.getAttribute('href');
      expect(href).toContain('home');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('link-home');
    });

    it('should find textbox with matching placeholder and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('textbox', 'Textarea content');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });

    it('should return empty when no match for combined criteria', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('button', 'nonexistent-text');
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findElements with exact matching', () => {
    it('should find exact text match and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard Button', true);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should not find partial match with exact=true', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard', true);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial match with exact=false', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard', false);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findElements with parent parameter', () => {
    it('should find elements within parent by type only and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements('button', null, false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements within parent by text only and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements(null, 'Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements within parent by type and text and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements('button', 'Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should return empty when no match in parent', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements('textbox', null, false, parent);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find links within navigation section and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElements('link', 'Home', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElements return format', () => {
    it('should return elements with boundingBox and tagName', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElements('button', 'Standard Button');
      `);
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
    });
  });
});