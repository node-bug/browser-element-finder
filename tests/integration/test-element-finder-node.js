/**
 * Selenium Test Script for Element Finder
 * Tests the browser-element-finder.js with Selenium WebDriver
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Element Finder Selenium Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const fileUrl = 'https://seleniumbase.io/demo_page';
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);
  });

  afterAll(async () => {
    await driver.quit();
  });

  it('should find all buttons', async () => {
    const buttons = await driver.executeScript(`
      return ElementFinder.findElement('button');
    `);
    expect(buttons.elements.length).toBeGreaterThan(0);
  });

  it('should find textboxes', async () => {
    const textboxes = await driver.executeScript(`
      return ElementFinder.findElement('textbox');
    `);
    expect(textboxes.elements.length).toBeGreaterThan(0);
  });

  it('should find buttons with specific text', async () => {
    const submitButtons = await driver.executeScript(`
      return ElementFinder.findElement('button', 'Click Me');
    `);
    expect(submitButtons.elements.length).toBeGreaterThan(0);
  });

  it('should find all links', async () => {
    const links = await driver.executeScript(`
      return ElementFinder.findElement('link');
    `);
    expect(links.elements.length).toBeGreaterThan(0);
  });

  it('should find all checkboxes', async () => {
    const checkboxes = await driver.executeScript(`
      return ElementFinder.findElement('checkbox');
    `);
    expect(checkboxes.elements.length).toBeGreaterThan(0);
  });

  it('should find all dropdowns', async () => {
    const dropdowns = await driver.executeScript(`
      return ElementFinder.findElement('dropdown');
    `);
    expect(dropdowns.elements.length).toBeGreaterThan(0);
  });

  it('should find all tables', async () => {
    const tables = await driver.executeScript(`
      return ElementFinder.findElement('table');
    `);
    expect(tables.elements.length).toBeGreaterThan(0);
  });

  it('should return valid element types', async () => {
    const types = await driver.executeScript(`
      return ElementFinder.getValidTypes();
    `);
    expect(types).toContain('button');
    expect(types).toContain('textbox');
    expect(types).toContain('link');
  });

  it('should click button using returned WebElement', async () => {
    const buttonResult = await driver.executeScript(`
      return ElementFinder.findElement('button', 'Click Me');
    `);
    expect(buttonResult.elements.length).toBeGreaterThan(0);
    
    if (buttonResult.elements.length > 0) {
      // Element is now returned as object with element property
      const buttonElement = buttonResult.elements[0].element;
      const tagName = await buttonElement.getTagName();
      expect(tagName).toBe('button');
      await buttonElement.click();
    }
  });

  it('should manage searchable attributes', async () => {
    const originalAttrs = await driver.executeScript(`
      return ElementFinder.getSearchableAttributes();
    `);
    expect(originalAttrs.length).toBeGreaterThan(0);
    
    await driver.executeScript(`
      ElementFinder.setSearchableAttributes(['id', 'data-test-id', 'custom-attr']);
    `);
    
    const newAttrs = await driver.executeScript(`
      return ElementFinder.getSearchableAttributes();
    `);
    expect(newAttrs).toEqual(['id', 'data-test-id', 'custom-attr']);
  });

  it('should find elements by text', async () => {
    const textResults = await driver.executeScript(`
      return ElementFinder.findElement(null, 'seleniumbase');
    `);
    expect(textResults.elements.length).toBeGreaterThan(0);
  });

  it('should find links by text', async () => {
    const linkTextResults = await driver.executeScript(`
      return ElementFinder.findElement('link', 'seleniumbase');
    `);
    expect(linkTextResults.elements.length).toBeGreaterThan(0);
  });
});