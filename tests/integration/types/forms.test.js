/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in browser
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType Integration Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'forms.html');
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

    it('should find buttons and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('submit-form');
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find textboxes and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(12);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find links and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dropdowns and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-range');
    });

    it('should find datepickers and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('datepicker');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-date');
    });

    it('should find colorpickers and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('colorpicker');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-color');
    });

    it('should find radios and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
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
      expect(mainElements.length).toBe(0);
    });

    it('should return empty array for unknown type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('unknown-type-xyz');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should throw TypeError for non-string type', async () => {
      await expect(async () => {
        await driver.executeScript(`
          return ElementFinder.findElementsByType(123);
        `);
      }).rejects.toThrow();
    });
  });

  describe('inViewport flag for Disabled Field (below the fold)', () => {
    // The "Disabled Field" lives in Section 5 of forms.html, well below the
    // initial viewport. We force a small window size so the test is
    // deterministic regardless of the host's default Chrome dimensions,
    // scroll back to the top before measuring, then scroll the element into
    // view and re-measure to confirm inViewport flips to true.

    beforeAll(async () => {
      await driver.manage().window().setRect({ width: 800, height: 600 });
      // Make sure we start at the top so the field is below the fold
      await driver.executeScript('window.scrollTo(0, 0);');
    });

    it('should report inViewport=false for the Disabled Field when it is below the fold', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('textbox', null, false, null, { failOnUnknownType: false })
          .elements
          .find((e) => e.element && e.element.getAttribute('data-test-id') === 'val-disabled');
      `);
      expect(result).toBeDefined();
      expect(result.element).toBeDefined();

      // The field must be present and currently scrolled out of view
      const rect = await driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: window.innerHeight };
      `);
      expect(rect.bottom).toBeGreaterThan(rect.height);

      // The library should report inViewport=false because the rect is below the viewport
      expect(result.inViewport).toBe(false);
    });

    it('should report inViewport=true after scrolling the Disabled Field into view', async () => {
      // Scroll the field into view using the native API
      await driver.executeScript(`
        document.querySelector('[data-test-id="val-disabled"]')
          .scrollIntoView({ block: 'center' });
      `);
      await driver.sleep(100);

      // Re-run the find so we get fresh flag values for the new scroll position
      const result = await driver.executeScript(`
        return ElementFinder.findElementsByType('textbox', null, false, null, { failOnUnknownType: false })
          .elements
          .find((e) => e.element && e.element.getAttribute('data-test-id') === 'val-disabled');
      `);
      expect(result).toBeDefined();
      expect(result.element).toBeDefined();

      // Sanity check: confirm the element really is inside the viewport now
      const rect = await driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: window.innerHeight };
      `);
      expect(rect.top).toBeLessThan(rect.height);
      expect(rect.bottom).toBeGreaterThan(0);

      expect(result.inViewport).toBe(true);
    });

    it('should expose ElementFinder.inViewport helper with the same value for the field', async () => {
      // After the previous test scrolled the field into view, the helper
      // function should agree with the flag on the result object.
      const inViewportFlag = await driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        return ElementFinder.inViewport(el);
      `);
      expect(inViewportFlag).toBe(true);
    });
  });
});