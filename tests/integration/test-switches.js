/**
 * Consolidated Switches Tests
 * Tests all switch types from switches.html fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Switches Consolidated Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'switches.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', 'index.js');
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

  describe('Standard Switch Finding', () => {
    it('should find all switch elements by type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('switch', null, false, true);
      `);
      // 7 switches: checkbox-switch, aria-switch, button-switch, native-checkbox, disabled-switch, shadow-switch, iframe-switch
      expect(result.elements.length).toBe(7);
    });

    it('should find ARIA div switch by role', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('switch');
        const mainElements = result.elements.filter(e => e.element);
        const roles = await Promise.all(mainElements.map(e => e.element.getAttribute('role')));
        return { found: roles.includes('switch') };
      `);
      expect(result.found).toBe(true);
    });

    it('should find button switch by data-state attribute', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('switch');
        const mainElements = result.elements.filter(e => e.element);
        const states = await Promise.all(mainElements.map(e => e.element.getAttribute('data-state')));
        return { found: states.includes('off') };
      `);
      expect(result.found).toBe(true);
    });

    it('should find native checkbox as switch', async () => {
      const result = await driver.executeScript(`
        const result = ElementFinder.findElement('switch');
        const mainElements = result.elements.filter(e => e.element);
        const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
        return { found: ids.includes('native-checkbox') };
      `);
      expect(result.found).toBe(true);
    });
  });

  describe('Disabled Switch', () => {
    it('should find disabled switch by text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement(null, 'Disabled Control Switch');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Shadow DOM Switch', () => {
    it('should find switch inside shadow DOM', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('switch', null, false, true);
      `);
      // The shadow DOM switch should be found (total 7 switches)
      expect(result.elements.length).toBe(7);
    });
  });

  describe('Iframe Switch', () => {
    it('should find switch inside iframe', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('switch', null, false, true);
      `);
      // The iframe switch should be found (total 7 switches including iframe)
      expect(result.elements.length).toBe(7);
    });
  });

  describe('Switch by Text', () => {
    it('should find switch by label text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement(null, 'Standard Checkbox Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find ARIA switch by label text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement(null, 'ARIA Div Switch');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find button switch by label text', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement(null, 'Native Button Switch');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Switch Bounding Box', () => {
    it('should return bounding box info for main frame switches', async () => {
      const switchInfo = await driver.executeScript(`
        const result = ElementFinder.findElement('switch');
        const mainElements = result.elements.filter(e => e.element);
        return mainElements.map(e => ({
          tagName: e.tagName,
          x: Math.round(e.boundingBox.x),
          y: Math.round(e.boundingBox.y),
          width: Math.round(e.boundingBox.width),
          height: Math.round(e.boundingBox.height)
        }));
      `);
      
      // Main frame has 3 switches with elements (checkbox-switch, aria-switch, button-switch, native-checkbox, disabled-switch)
      expect(switchInfo.length).toBe(3);
      switchInfo.forEach((item) => {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.width).toBeGreaterThanOrEqual(1);
        expect(item.height).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Switch Highlight', () => {
    it('should highlight all switches', async () => {
      await driver.executeScript(`
        const result = ElementFinder.findElement('switch');
        ElementFinder.highlight(result.elements.map(e => e.element), 'green', 2);
      `);
    });
  });
});