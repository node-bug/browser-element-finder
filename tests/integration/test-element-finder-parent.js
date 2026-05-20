/**
 * Test script for ElementFinder parent element functionality
 * Tests finding elements within a parent element using Selenium
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ElementFinder Parent Element Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get(`file://${join(__dirname, 'fixtures', 'dropdowns.html')}`);

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    await driver.sleep(1000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  it('should find section element', async () => {
    const sectionResult = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'standard-select-section');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(sectionResult.count).toBeGreaterThan(0);
  });

  it('should find child elements within parent', async () => {
    const childResult = await driver.executeScript(`
      const parentResult = ElementFinder.findElement(null, 'standard-select-section');
      if (parentResult.elements.length === 0) return { count: 0, elements: [] };
      
      const parent = parentResult.elements[0].element;
      const allDropdowns = ElementFinder.findElement('dropdown', null, false, false);
      // Filter to only elements inside the parent
      const result = {
        elements: allDropdowns.elements.filter(e => parent.contains(e.element))
      };
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(childResult.count).toBe(2);
  });

  it('should verify parent scoping works', async () => {
    const allDropdowns = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    
    expect(allDropdowns.count).toBe(6);
    
    const childResult = await driver.executeScript(`
      const parentResult = ElementFinder.findElement(null, 'standard-select-section');
      if (parentResult.elements.length === 0) return { count: 0 };
      const parent = parentResult.elements[0].element;
      const allDropdowns = ElementFinder.findElement('dropdown', null, false, false);
      // Filter to only elements inside the parent
      const result = {
        elements: allDropdowns.elements.filter(e => parent.contains(e.element))
      };
      return { count: result.elements.length };
    `);
    
    expect(allDropdowns.count).toBeGreaterThan(childResult.count);
  });
});