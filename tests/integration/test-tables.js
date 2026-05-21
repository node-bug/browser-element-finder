/**
 * Consolidated Tables Tests
 * Tests table, row, and column element finding
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Tables Consolidated Tests', () => {
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
    expect(tableDetails.count).toBeGreaterThanOrEqual(6);
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
    expect(rowDetails.count).toBeGreaterThanOrEqual(120);
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
    expect(columnDetails.count).toBeGreaterThanOrEqual(225);
  });

  it('should find table by text content', async () => {
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

  it('should find all cells in a column by header text', async () => {
    const columnResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'City');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    expect(columnResult.count).toBeGreaterThanOrEqual(4);
    
    const texts = columnResult.elements.map(e => e.text);
    expect(texts).toContain('City');
    expect(texts).toContain('New York');
    expect(texts).toContain('London');
    expect(texts).toContain('Paris');
  });

  it('should find all cells in Name column by header text', async () => {
    const columnResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'Name');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    expect(columnResult.count).toBeGreaterThanOrEqual(4);
    
    const texts = columnResult.elements.map(e => e.text);
    expect(texts).toContain('Name');
    expect(texts).toContain('Alice');
    expect(texts).toContain('Bob');
    expect(texts).toContain('Charlie');
  });

  it('should find all cells in Age column by header text', async () => {
    const columnResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'Age');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    expect(columnResult.count).toBeGreaterThanOrEqual(4);
    
    const texts = columnResult.elements.map(e => e.text);
    expect(texts).toContain('Age');
    expect(texts).toContain('30');
    expect(texts).toContain('25');
    expect(texts).toContain('35');
  });
});