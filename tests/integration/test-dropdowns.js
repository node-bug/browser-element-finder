/**
 * Consolidated Dropdowns and Forms Tests
 * Combines tests from: test-dropdowns.js, test-forms.js, test-element-finder-parent.js
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dropdowns and Forms Consolidated Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'dropdowns.html');
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
    
    expect(dropdownDetails.length).toBe(6);
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
    
    expect(dropdownInfo.length).toBe(6);
    dropdownInfo.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
    });
  });

  describe('Parent Element Scoping', () => {
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
        const result = {
          elements: allDropdowns.elements.filter(e => parent.contains(e.element))
        };
        return { count: result.elements.length };
      `);
      
      expect(allDropdowns.count).toBeGreaterThan(childResult.count);
    });
  });

  describe('Highlight and Unhighlight', () => {
    it('should highlight elements', async () => {
      await driver.executeScript(`
        const result = ElementFinder.findElement('dropdown');
        ElementFinder.highlight(result.elements.map(e => e.element));
      `);
      await driver.sleep(500);
    });

    it('should unhighlight elements', async () => {
      await driver.executeScript(`
        const result = ElementFinder.findElement('dropdown');
        ElementFinder.unhighlight(result.elements.map(e => e.element));
      `);
    });
  });
});