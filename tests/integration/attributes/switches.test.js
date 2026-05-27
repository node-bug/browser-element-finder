/**
 * Integration tests for ElementFinderByAttribute
 * Tests finding switch elements by attribute values in browser
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByAttribute Integration Tests - Switches', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'switches.html');
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

  describe('findElementByAttributes - ID', () => {
    it('should find standard checkbox switch by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('checkbox-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('checkbox-switch');
    });

    it('should find ARIA switch by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('aria-switch');
      `);
      // Finds both the div and its label (aria-labelledby references the label)
      expect(result.elements.length).toBe(1);
      const ids = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('id'))
      );
      expect(ids).toContain('aria-switch');
    });

    it('should find button switch by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('button-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('button-switch');
    });

    it('should find native checkbox by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('native-checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('native-checkbox');
    });

    it('should find disabled switch by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('disabled-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('disabled-switch');
    });
  });

  describe('findElementByAttributes - ARIA attributes', () => {
    it('should find ARIA switch by role attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const roles = await Promise.all(mainElements.map(e => e.element.getAttribute('role')));
      expect(roles).toContain('switch');
    });

    it('should find ARIA switch by aria-labelledby attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('aria-label');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const ariaLabelledBy = await Promise.all(mainElements.map(e => e.element.getAttribute('aria-labelledby')));
      expect(ariaLabelledBy).toContain('aria-label');
    });
  });

  describe('findElementByAttributes - data attributes', () => {
    it('should find button switch by text content "OFF"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('OFF');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const textContent = await mainElements[0].element.getText();
      expect(textContent).toBe('OFF');
    });
  });

  describe('findElementByAttributes - Label Text', () => {
    it('should find switch by label text "Standard Checkbox Switch"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Standard Checkbox Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find ARIA switch by label text "ARIA Div Switch"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('ARIA Div Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find button switch by label text "Native Button Switch"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Native Button Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find disabled switch by label text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Disabled Control Switch');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('findElementByAttributes - Shadow DOM', () => {
    it('should find switch inside shadow DOM by id', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('shadow-switch');
      `);
      // Shadow DOM elements are found but may not have a direct element reference
      expect(result.elements.length).toBe(1);
    });
  });

  describe('findElementByAttributes - Iframe', () => {
    it('should find switch inside iframe by label text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByAttributes('Document Switch Window Node');
      `);
      // Iframe elements are found but may not have a direct element reference
      expect(result.elements.length).toBe(1);
    });
  });
});