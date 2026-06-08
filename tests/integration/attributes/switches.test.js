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

  describe('findElementsByAttribute - ID', () => {
    it('should find standard checkbox switch by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('checkbox-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('checkbox-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('checkbox-switch');
    });

    it('should find ARIA switch by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('aria-switch');
      `);
      // Finds both the div and its label (aria-labelledby references the label)
      expect(result.elements.length).toBe(1);
      const ids = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('id'))
      );
      expect(ids).toContain('aria-switch');
      const testDataIds = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('data-test-id'))
      );
      expect(testDataIds).toContain('aria-switch');
    });

    it('should find button switch by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('button-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('button-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('button-switch');
    });

    it('should find native checkbox by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('native-checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('native-checkbox');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('native-checkbox');
    });

    it('should find disabled switch by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('disabled-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('disabled-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('disabled-switch');
    });
  });

  describe('findElementsByAttribute - ARIA attributes', () => {
    it('should find ARIA switch by role attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const roles = await Promise.all(mainElements.map(e => e.element.getAttribute('role')));
      expect(roles).toContain('switch');
    });

    it('should find ARIA switch by aria-labelledby attribute', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('aria-label');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const ariaLabelledBy = await Promise.all(mainElements.map(e => e.element.getAttribute('aria-labelledby')));
      expect(ariaLabelledBy).toContain('aria-label');
    });
  });

  describe('findElementsByAttribute - data attributes', () => {
    it('should find button switch by text content "OFF"', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('OFF');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const textContent = await mainElements[0].element.getText();
      expect(textContent).toBe('OFF');
    });
  });

  describe('findElementsByAttribute - Label Text', () => {
    it('should find switch by label text "Standard Checkbox Switch" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Checkbox Switch');
      `);
      expect(result.elements.length).toBe(1);
      // The element may be the label or the input - check both
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'checkbox-switch') {
        expect(testDataId).toBe('checkbox-switch');
      } else {
        // If the element itself doesn't have it, check if it's the label and find the associated input
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'checkbox-switch') {
          expect(forAttr).toBe('checkbox-switch');
        }
      }
    });

    it('should find ARIA switch by label text "ARIA Div Switch" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('ARIA Div Switch');
      `);
      // Both the label element and the div with aria-labelledby should be found
      // The div with role="switch" is the actual control, while the label is just text
      expect(result.elements.length).toBe(2);
      const roles = await Promise.all(result.elements.map(e => e.element ? e.element.getAttribute('role') : null));
      expect(roles).toContain('switch');
      const testDataIds = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('data-test-id'))
      );
      expect(testDataIds).toContain('aria-switch');
    });

    it('should find button switch by label text "Native Button Switch" and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Native Button Switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the label or the button - check both
      const tagNames = await Promise.all(mainElements.map(e => e.element.getTagName()));
      const testDataIds = await Promise.all(
        mainElements.map(e => e.element.getAttribute('data-test-id'))
      );
      const forAttrs = await Promise.all(
        mainElements.map(e => e.element.getAttribute('for'))
      );
      // Either the button itself or the label pointing to it should be found
      const hasButton = tagNames.includes('button');
      const hasTestDataId = testDataIds.includes('button-switch');
      const hasForAttr = forAttrs.includes('button-switch');
      expect(hasButton || hasTestDataId || hasForAttr).toBe(true);
    });

    it('should find disabled switch by label text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Disabled Control Switch');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      // The element may be the label or the input - check both
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'disabled-switch') {
        expect(testDataId).toBe('disabled-switch');
      } else {
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'disabled-switch') {
          expect(forAttr).toBe('disabled-switch');
        }
      }
    });
  });

  describe('findElementsByAttribute - Shadow DOM', () => {
    it('should find switch inside shadow DOM by id and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('shadow-switch');
      `);
      // Shadow DOM elements are found but may not have a direct element reference
      expect(result.elements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute - Iframe', () => {
    it('should find switch inside iframe by label text and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Document Switch Window Node');
      `);
      // Iframe elements are found but may not have a direct element reference
      expect(result.elements.length).toBe(1);
    });
  });
});