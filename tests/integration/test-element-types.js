/**
 * Consolidated Element Types Tests
 * Tests all element types from element-types.html fixture
 * Combines tests from: test-element-types.js, test-forms.js, test-switches.js, test-interactive-elements.js
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Element Types Consolidated Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'element-types.html');
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

  describe('Navigation', () => {
    it('should find nav elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('navigation');
      `);
      expect(result.elements.length).toBe(2);
    });
  });

  describe('Headings', () => {
    it('should find h1-h6 elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('heading');
      `);
      expect(result.elements.length).toBe(24);
    });
  });

  describe('Buttons', () => {
    it('should find button elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('button');
      `);
      expect(result.elements.length).toBe(7);
    });
  });

  describe('Checkboxes', () => {
    it('should find checkbox elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('checkbox');
      `);
      expect(result.elements.length).toBe(3);
    });
  });

  describe('Switches', () => {
    it('should find switch elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('switch');
      `);
      expect(result.elements.length).toBe(4);
    });
  });

  describe('Sliders', () => {
    it('should find slider elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('slider');
      `);
      expect(result.elements.length).toBe(2);
    });
  });

  describe('Radio Buttons', () => {
    it('should find radio elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('radio');
      `);
      expect(result.elements.length).toBe(2);
    });
  });

  describe('Dropdowns', () => {
    it('should find dropdown elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('dropdown');
      `);
      expect(result.elements.length).toBe(4);
    });
  });

  describe('Textboxes', () => {
    it('should find textbox elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('textbox');
      `);
      expect(result.elements.length).toBe(6);
    });
  });

  describe('File Inputs', () => {
    it('should find file elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('file');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Lists', () => {
    it('should find list elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('list');
      `);
      expect(result.elements.length).toBe(3);
    });

    it('should find listitem elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('listitem');
      `);
      expect(result.elements.length).toBe(5);
    });
  });

  describe('Menu', () => {
    it('should find menu elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('menu');
      `);
      expect(result.elements.length).toBe(2);
    });

    it('should find menuitem elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('menuitem');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Toolbar', () => {
    it('should find toolbar elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('toolbar');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Dialog', () => {
    it('should find dialog elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('dialog');
      `);
      expect(result.elements.length).toBe(1);
    });
  });

  describe('Images', () => {
    it('should find image elements', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('image');
      `);
      expect(result.elements.length).toBe(2);
    });
  });
});