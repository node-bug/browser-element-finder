/**
 * Integration tests for ElementFinderByAttribute
 * Tests finding elements by attribute values in shadow DOM
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByAttribute Integration Tests - Shadow DOM', () => {
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

    const finderPath = join(__dirname, '..', '..', '..', 'index-by-attribute.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByAttribute = ElementFinderByAttribute;
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
    it('should find elements by id attribute in basic shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('shadow-name-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Verify at least one element has the expected id
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-name-input');
    });

    it('should find elements by placeholder attribute in shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Enter your name');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Verify at least one element has the expected id
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-name-input');
    });

    it('should find elements by visible text in shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(5);
    });

    it('should find elements by data-test-id attribute in shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('shadow-help');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      // Verify at least one element has the expected id
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-help-link');
    });
  });

  describe('Multiple Shadow Hosts - Section 2', () => {
    it('should find elements in multiple shadow hosts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(5); // shadow-submit-btn, login-submit-btn, signup-submit-btn, combined-shadow-btn, dynamic-btn
    });

    it('should find elements by id in specific shadow host', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('login-user-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // Found in shadow root and possibly another context
    });

    it('should find elements by id in second shadow host', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('signup-name-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // Found in shadow root and possibly another context
    });
  });

  describe('Nested Shadow DOM - Section 3', () => {
    it('should find elements in two-level nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Inner Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // inner-btn and possibly another match
    });

    it('should find elements in three-level deep nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Level 3 Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // deep-l3-btn and possibly another match
    });

    it('should find elements in five-level deep nested shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Deepest Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // five-deepest-btn and possibly another match
    });
  });

  describe('Shadow DOM in Iframe - Section 5', () => {
    it('should find elements in shadow DOM inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Shadow input in frame');
      `);
      // iframe shadow elements are returned without element property
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });

    it('should find buttons in shadow DOM inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Shadow Frame Button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });

    it('should find elements in nested shadow inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Frame Inner Button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });
  });

  describe('Web Components - Section 8', () => {
    it('should find elements in custom button web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Component Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in custom input web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Component Input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in custom toggle web component', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Component Toggle');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('Combined Regular + Shadow DOM - Section 9', () => {
    it('should find elements in both regular and shadow DOM contexts', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(1);
    });

    it('should find regular DOM elements separately', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('regular-btn');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('Dynamic Shadow DOM - Section 7', () => {
    it('should find elements in dynamically created shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinderByAttribute.findElementByAttributes('Dynamic Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1); // dynamic-btn and possibly another match
    });
  });
});