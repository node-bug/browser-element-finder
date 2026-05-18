/**
 * Test Switches Element Finder
 * Tests that switches in switches.html can be identified and highlighted
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Switches Element Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'switches.html');
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

  it('should find all switches including hidden', async () => {
    const switchDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result.elements.map(e => ({
        tagName: e.tagName,
        role: e.element.getAttribute('role'),
        type: e.element.getAttribute('type'),
        id: e.element.getAttribute('id')
      }));
    `);
    // 6 switches (1 is inside an iframe which is no longer traversed)
    expect(switchDetails.length).toBe(6);
  });

  it('should highlight all switches', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      ElementFinder.highlight(result.elements.map(e => e.element), 'green', 3);
    `);
  });

  it('should return bounding box info for switches', async () => {
    const switchInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    // 6 switches (1 is inside an iframe which is no longer traversed)
    expect(switchInfo.length).toBe(6);
    switchInfo.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
    });
  });
});