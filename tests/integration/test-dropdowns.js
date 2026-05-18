/**
 * Test Dropdowns Element Finder
 * Tests that dropdowns in dropdowns.html can be identified and highlighted
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dropdowns Element Finder', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless','--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Load the dropdowns HTML file
    const htmlPath = join(__dirname, 'fixtures', 'dropdowns.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for page to load
    await driver.sleep(500);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  it('should find all dropdowns', async () => {
    const dropdownDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        className: e.element.getAttribute('class'),
        role: e.element.getAttribute('role')
      }));
    `);
    
    expect(dropdownDetails.length).toBe(5);
    console.log(`Found ${dropdownDetails.length} dropdowns`);
  });

  it('should highlight all dropdowns', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      ElementFinder.highlight(result.elements.map(e => e.element), 'blue', 3);
    `);
  });

  it('should return bounding box info for dropdowns', async () => {
    const dropdownInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    
    expect(dropdownInfo.length).toBe(5);
    dropdownInfo.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
    });
  });

  it('should interact with dropdown elements using Selenium WebElement methods', async () => {
    // Find dropdowns using ElementFinder
    const dropdownResult = await driver.executeScript(`
      return ElementFinder.findElement('dropdown');
    `);
    
    expect(dropdownResult.elements.length).toBeGreaterThan(0);
    
    // Get the first dropdown element - this is a Selenium WebElement
    const firstDropdown = dropdownResult.elements[0].element;
    
    // Demonstrate Selenium WebElement interaction
    const tagName = await firstDropdown.getTagName();
    expect(tagName).toBe('select');
    
    // Get the element's id attribute using Selenium
    const elementId = await firstDropdown.getAttribute('id');
    expect(elementId).toBeTruthy();
    
    // Get the element's class attribute using Selenium
    const className = await firstDropdown.getAttribute('class');
    expect(className).toBeTruthy();
    
    // Find options within the dropdown using Selenium
    const options = await firstDropdown.findElements({ css: 'option' });
    expect(options.length).toBeGreaterThan(0);
    
    // Select an option using Selenium
    await options[1].click();
    
    // Verify the selection using Selenium
    const selectedOption = await firstDropdown.findElement({ css: 'option:checked' });
    const selectedText = await selectedOption.getText();
    expect(selectedText.length).toBeGreaterThan(0);
  });

  it('should find dropdown by option text', async () => {
    // Find dropdown by option text "Apple"
    const dropdownByOptionText = await driver.executeScript(`
      return ElementFinder.findElement('dropdown', 'Apple');
    `);
    
    expect(dropdownByOptionText.elements.length).toBe(1);
    expect(dropdownByOptionText.elements[0].tagName).toBe('select');
    const elementId = await dropdownByOptionText.elements[0].element.getAttribute('id');
    expect(elementId).toBe('single-select');
  });

  it('should find dropdown by partial option text', async () => {
    // Find dropdown by partial option text "Fruits"
    const dropdownByPartialText = await driver.executeScript(`
      return ElementFinder.findElement('dropdown', 'Fruits');
    `);
    
    expect(dropdownByPartialText.elements.length).toBe(1);
    expect(dropdownByPartialText.elements[0].tagName).toBe('select');
    const elementId = await dropdownByPartialText.elements[0].element.getAttribute('id');
    expect(elementId).toBe('category-select');
  });
});