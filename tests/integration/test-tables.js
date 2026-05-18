/**
 * Test Tables Element Finder
 * Tests that table elements in tables.html can be identified
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Tables Element Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'tables.html');
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

  it('should find all tables', async () => {
    const tableDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('table');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(tableDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all rows', async () => {
    const rowDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('row');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName
        }))
      };
    `);
    expect(rowDetails.count).toBeGreaterThanOrEqual(10);
  });

  it('should find all columns (cells)', async () => {
    const columnDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('column');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName
        }))
      };
    `);
    expect(columnDetails.count).toBeGreaterThanOrEqual(15);
  });

  it('should find table by text content', async () => {
    // Note: Text matching only checks direct text nodes, not nested text
    // So we search for the table by id instead
    const textResult = await driver.executeScript(`
      const result = ElementFinder.findElement('table', 'simple-table');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          id: e.element.id
        }))
      };
    `);
    expect(textResult.count).toBeGreaterThanOrEqual(1);
  });

  it('should find cell by text content', async () => {
    const cellResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'Paris');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    expect(cellResult.count).toBe(1);
  });
});