/**
 * Integration tests for findProbableElements function - edge cases
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinder - findProbableElements edge cases', () => {
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

  describe('findProbableElements direct match', () => {
    it('should find element matching both type and text directly and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('button', 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find textbox with matching placeholder and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Textarea content');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });

    it('should find link with matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('link', 'Home');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const href = await mainElements[0].element.getAttribute('href');
      expect(href).toContain('home');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('link-home');
    });
  });

  describe('findProbableElements fallback to nearby element', () => {
    it('should find nearby parent menu when child button contains matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('menu', 'Menu Item 1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('menu-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-standard');
    });

    it('should find nearby parent toolbar when child contains matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('toolbar', 'Toolbar Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('toolbar-role');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('toolbar-role');
    });

    it('should find nearby parent menu when child contains matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('menu', 'Role Menu Item');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('menu-role');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-role');
    });

    it('should find nearby parent list when child contains matching text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('list', 'Role List Item');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('list-role');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('list-role');
    });
  });

  describe('findProbableElements no match scenarios', () => {
    it('should return empty when no element matches both criteria and no nearby type exists', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('radio', 'nonexistent-text');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should return empty for unknown element type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('unknown-type', 'text');
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findProbableElements with parent parameter', () => {
    it('should search within parent for direct match and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findProbableElements('button', 'Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should search within parent for fallback match and validate first match', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('menu-section');
        return ElementFinder.findProbableElements('menu', 'Menu Item 1', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('menu-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-standard');
    });

    it('should return empty when no match in parent', async () => {
      const result = await driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findProbableElements('textbox', 'nonexistent', false, parent);
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findProbableElements exact matching', () => {
    it('should find exact text match and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Textarea content', true);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });

    it('should not find partial match with exact=true', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Textarea', true);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial match with exact=false and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Textarea', false);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });
  });

  describe('findProbableElements return format', () => {
    it('should return elements with boundingBox and tagName and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findProbableElements('button', 'Standard Button');
      `);
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
      const testDataId = await result.elements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });
});