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
    expect(tableDetails.count).toBe(6);
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
    expect(rowDetails.count).toBe(120);
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
    expect(columnDetails.count).toBe(256);
  });

  it('should find all cells (td elements only)', async () => {
    const cellDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('cell');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName
        }))
      };
    `);
    // cell type should only return td elements (not th), so fewer than column
    expect(cellDetails.count).toBe(240);
    // All should be td elements
    for (const el of cellDetails.elements) {
      expect(el.tagName).toBe('td');
    }
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
    expect(textResult.count).toBe(1);
  });

  it('should find cell by text content', async () => {
    const cellResult = await driver.executeScript(`
      const result = ElementFinder.findElement('cell', 'Paris');
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

  it('should find cell by header text returns only the header cell, not the whole column', async () => {
    const cellResult = await driver.executeScript(`
      const result = ElementFinder.findElement('cell', 'City');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    // cell type should not match th elements, so this should return 0
    // (City is in a th element, not a td)
    expect(cellResult.count).toBe(0);
  });

  it('should find cell by data cell text returns only that cell', async () => {
    const cellResult = await driver.executeScript(`
      const result = ElementFinder.findElement('cell', 'Paris');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    // cell type should only return the single td element with 'Paris', not expand to column
    expect(cellResult.count).toBe(1);
    expect(cellResult.elements[0].tagName).toBe('td');
    expect(cellResult.elements[0].text).toBe('Paris');
  });

  it('should find column by header text returns all cells in column', async () => {
    const columnResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'London');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    expect(columnResult.count).toBe(4);
    
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
    expect(columnResult.count).toBe(4);
    
    const texts = columnResult.elements.map(e => e.text);
    expect(texts).toContain('Name');
    expect(texts).toContain('Alice');
    expect(texts).toContain('Bob');
    expect(texts).toContain('Charlie');
  });

  it('should return no results for non-existent element type', async () => {
    const result = await driver.executeScript(`
      const result = ElementFinder.findElement('nonexistenttype');
      return { count: result.elements.length };
    `);
    expect(result.count).toBe(0);
  });

  it('should return no results when searching for non-existent text content', async () => {
    const result = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'NonExistentText');
      return { count: result.elements.length };
    `);
    expect(result.count).toBe(0);
  });

  it('should return no results for non-existent element type with text search', async () => {
    const result = await driver.executeScript(`
      const result = ElementFinder.findElement('nonexistenttype', 'some text');
      return { count: result.elements.length };
    `);
    expect(result.count).toBe(0);
  });
});