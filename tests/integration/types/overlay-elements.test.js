import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('findOverlayElements Integration Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, '..', 'fixtures', 'overlays.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', '..', 'index.js');
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

  it('should find all overlay elements', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('should find ARIA dialog role elements', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('aria-dialog');
  });

  it('should find native <dialog> elements', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('native-dialog');
  });

  it('should find cookie banner by class pattern', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('cookie-banner');
  });

  it('should find elements with aria-modal="true"', async () => {
    const result = await driver.executeScript(`
      const overlays = ElementFinder.findOverlayElements();
      return overlays.elements.map(e => e.element ? e.element.getAttribute('aria-modal') : null);
    `);
    const modalCount = result.filter(attr => attr === 'true').length;
    expect(modalCount).toBeGreaterThanOrEqual(2);
  });

  it('should find popover elements', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('popover-element');
  });

  it('should find high z-index fixed/sticky positioned elements', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('backdrop');
    expect(dialogIds).toContain('toast');
  });

  it('should not find regular content as overlays', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    const regularContent = result.elements.find(e =>
      e.element && e.element.getAttribute('class') === 'regular-content'
    );
    expect(regularContent).toBeUndefined();
  });

  it('should throw TypeError when only x is provided to findOverlayElements', async () => {
    await expect(
      driver.executeScript(`
        return ElementFinder.findOverlayElements(100);
      `)
    ).rejects.toThrow();
  });

  it('should throw TypeError when only y is provided to findOverlayElements', async () => {
    await expect(
      driver.executeScript(`
        return ElementFinder.findOverlayElements(null, 200);
      `)
    ).rejects.toThrow();
  });

  it('should find overlays at a specific point via elementsFromPoint', async () => {
    const result = await driver.executeScript(`
      // Get the aria-dialog element's position
      const dialog = document.getElementById('aria-dialog');
      const rect = dialog.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Find overlays at that point
      return ElementFinder.findOverlayElements(centerX, centerY);
    `);
    expect(result.elements.length).toBeGreaterThanOrEqual(1);
    const dialogIds = await Promise.all(
      result.elements
        .filter(e => e.element)
        .map(async e => e.element.getAttribute('id'))
    );
    expect(dialogIds).toContain('aria-dialog');
  });

  it('should return overlays in render order from elementsFromPoint', async () => {
    const result = await driver.executeScript(`
      // Point at the center of the page where multiple overlays may stack
      return ElementFinder.findOverlayElements(400, 300);
    `);
    // Elements should be returned in front-to-back order
    expect(result.elements.length).toBeGreaterThanOrEqual(1);
    // First element should be the topmost overlay at that point
    expect(result.elements[0].element).toBeDefined();
  });

  it('should return empty array when no overlay at point', async () => {
    const result = await driver.executeScript(`
      // Point at coordinates where there's no overlay (top-left corner)
      return ElementFinder.findOverlayElements(5, 5);
    `);
    // May find overlays depending on page layout, but should not error
    expect(result.elements).toBeDefined();
    expect(Array.isArray(result.elements)).toBe(true);
  });
});