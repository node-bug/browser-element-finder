/**
 * Test Shadow DOM Element Finder
 * Tests that elements inside shadow DOM can be identified
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Shadow DOM Element Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'shadow-dom.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    await driver.sleep(2000);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  it('should find buttons in basic shadow DOM', async () => {
    const buttonCount = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return result.elements.length;
    `);
    expect(buttonCount).toBeGreaterThanOrEqual(20);
  });

  it('should find textboxes in shadow DOM', async () => {
    const textboxCount = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      return result.elements.length;
    `);
    expect(textboxCount).toBeGreaterThanOrEqual(15);
  });

  it('should find checkboxes in shadow DOM', async () => {
    const checkboxCount = await driver.executeScript(`
      const result = ElementFinder.findElement('checkbox');
      return result.elements.length;
    `);
    expect(checkboxCount).toBeGreaterThanOrEqual(5);
  });

  it('should find links in shadow DOM', async () => {
    const linkCount = await driver.executeScript(`
      const result = ElementFinder.findElement('link');
      return result.elements.length;
    `);
    expect(linkCount).toBeGreaterThanOrEqual(3);
  });

  it('should find elements by text in shadow DOM', async () => {
    const textCount = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Component Button');
      return result.elements.length;
    `);
    expect(textCount).toBe(1);
  });

  it('should verify bounding boxes are correct', async () => {
    const bboxInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return result.elements.map(e => ({
        tagName: e.tagName,
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    expect(bboxInfo.length).toBeGreaterThanOrEqual(20);
    bboxInfo.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('should highlight all textboxes', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      // Only highlight main frame elements (iframe elements don't have raw element reference)
      ElementFinder.highlight(result.elements.filter(e => e.element).map(e => e.element), 'blue', 2);
    `);
  });
});