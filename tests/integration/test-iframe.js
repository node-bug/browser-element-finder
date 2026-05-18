/**
 * Test script for ElementFinder iframe functionality
 * Tests finding elements in iframes using Selenium
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinder Iframe Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get(`file://${join(__dirname, 'fixtures', 'iframe-test.html')}`);

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for iframe to load
    await driver.sleep(500);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  it('should find all checkboxes including those in iframes by default', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findElement('checkbox', null, false, true);
    `);
    expect(result.elements.length).toBe(3);
    
    // Main frame checkbox has element reference, iframe checkboxes don't
    const mainFrameElements = result.elements.filter(e => e.element);
    const iframeElements = result.elements.filter(e => !e.element);
    
    expect(mainFrameElements.length).toBe(1);
    expect(iframeElements.length).toBe(2);
    
    // Main frame checkbox should have id 'main-checkbox'
    const mainCheckboxId = await mainFrameElements[0].element.getAttribute('id');
    expect(mainCheckboxId).toBe('main-checkbox');
  });

  it('should include frameIndex in results', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findElement('checkbox');
    `);
    
    // Check that frameIndex is present
    for (const el of result.elements) {
      expect(el.frameIndex).toBeDefined();
      expect(typeof el.frameIndex).toBe('number');
    }
    
    // Main frame checkbox should have frameIndex: -1
    const mainCheckbox = result.elements.find(e => e.element);
    expect(mainCheckbox.frameIndex).toBe(-1);
    
    // Iframe checkboxes should have frameIndex: 0
    const iframeCheckboxes = result.elements.filter(e => !e.element);
    for (const el of iframeCheckboxes) {
      expect(el.frameIndex).toBe(0);
    }
  });

  

  it('should find elements by text including those in iframes by default', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findElement(null, 'Iframe Checkbox');
    `);
    expect(result.elements.length).toBeGreaterThan(0);
  });
});