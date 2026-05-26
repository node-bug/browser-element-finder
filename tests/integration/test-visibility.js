/**
 * Visibility and Edge Cases Tests
 * Tests the comprehensive visibility detection logic
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Visibility and Edge Cases Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'visibility-edge-cases.html');
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

  it('should correctly identify visible and hidden elements', async () => {
    const visibilityResults = await driver.executeScript(`
      const results = ElementFinder.findElement('button');
      return results.elements.map(e => ({
        id: e.element.id,
        isVisible: e.isVisible
      }));
    `);

    const getVis = (id) => visibilityResults.find(r => r.id === id)?.isVisible;

    expect(getVis('btn-visible')).toBe(true);
    expect(getVis('btn-display-none')).toBe(false);
    expect(getVis('btn-vis-hidden')).toBe(false);
    expect(getVis('btn-opacity-0')).toBe(false);
    expect(getVis('btn-collapse')).toBe(false);
    expect(getVis('btn-size-0')).toBe(false);
    expect(getVis('btn-offscreen')).toBe(false);
    expect(getVis('btn-indent')).toBe(false);
    expect(getVis('btn-clip')).toBe(false);
    expect(getVis('btn-aria-hidden')).toBe(false);
    expect(getVis('btn-parent-display-none')).toBe(false);
    expect(getVis('btn-parent-vis-hidden')).toBe(false);
  });

  it('should find all elements regardless of visibility', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findElement('button');
    `);
    // 1 visible + 11 hidden = 12 buttons
    expect(result.elements.length).toBe(12);
  });
});
