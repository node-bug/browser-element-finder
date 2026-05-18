/**
 * Test Forms Element Finder
 * Tests that form elements in forms.html can be identified and highlighted
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Forms Element Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'forms.html');
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

  it('should find all textboxes', async () => {
    const textboxDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id,
          placeholder: e.element.getAttribute('placeholder')
        }))
      };
    `);
    expect(textboxDetails.count).toBeGreaterThanOrEqual(8);
  });

  it('should find all checkboxes', async () => {
    const checkboxDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('checkbox');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(checkboxDetails.count).toBeGreaterThanOrEqual(3);
  });

  it('should find all radio buttons', async () => {
    const radioDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('radio');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(radioDetails.count).toBeGreaterThanOrEqual(3);
  });

  it('should find textbox by placeholder text', async () => {
    const placeholderResult = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox', 'Enter text here');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          id: e.element.id,
          placeholder: e.element.getAttribute('placeholder')
        }))
      };
    `);
    expect(placeholderResult.count).toBe(1);
  });

  it('should highlight elements', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      ElementFinder.highlight(result.elements.map(e => e.element));
    `);
    await driver.sleep(500);
  });

  it('should unhighlight elements', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      ElementFinder.unhighlight(result.elements.map(e => e.element));
    `);
  });
});