/**
 * Integration tests for ElementFinderByType
 * Tests finding elements by type in switches fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinderByType - Switches Fixture', () => {
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

    await driver.sleep(2000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  describe('findElementByType', () => {
    it('should find all elements with "element" type', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('element');
      `);
      expect(result.elements.length).toBe(37);
    });

    it('should find switches', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // checkbox-switch, aria-switch, button-switch, native-checkbox, disabled-switch, shadow-switch, iframe-switch
      expect(mainElements.length).toBe(6);
    });

    it('should find checkboxes', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // checkbox-switch, native-checkbox, disabled-switch, shadow-switch, iframe-switch
      expect(mainElements.length).toBe(4);
    });

    it('should find buttons', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // button-switch
      expect(mainElements.length).toBe(1);
    });

    it('should find textboxes', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find links', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dropdowns', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find radios', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // h2 "Ultimate Switch Testing Lab"
      expect(mainElements.length).toBe(1);
    });

    it('should find navigation elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find images', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find tables', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find lists', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find file inputs', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('file');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find menus', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('menu');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find toolbars', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('toolbar');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dialogs', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElementByType('dialog');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });
  });
});