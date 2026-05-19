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
      return result
    `);
    // Should find exactly 7 switches in the main document (including shadow DOM switch, excluding iframe)
    expect(switchDetails.elements.length).toBe(7);
    expect(switchDetails.elements[0]).toHaveProperty('boundingBox');
    expect(switchDetails.elements[0]).toHaveProperty('frameIndex');
    expect(switchDetails.elements[0]).toHaveProperty('element');
    expect(switchDetails.elements[0]).toHaveProperty('tagName');
  });

  it('should highlight all switches', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      // Only highlight elements that have the element property (main frame elements)
      const mainFrameElements = result.elements.filter(e => e.element);
      ElementFinder.highlight(mainFrameElements.map(e => e.element), 'green', 3);
    `);
  });

  it('should return bounding box info for switches', async () => {
    const switchInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result
    `);
    // Should find exactly 7 switches with bounding boxes
    expect(switchInfo.elements.length).toBe(7);
    switchInfo.elements.forEach((item) => {
      expect(item.boundingBox.x).toBeGreaterThanOrEqual(0);
      expect(item.boundingBox.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('should highlight switch in shadow DOM', async () => {
    const shadowswitch = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', 'shadow-switch', false, true);
      return result
    `);
    expect(shadowswitch.elements.length).toBe(1);
    expect(shadowswitch.elements[0]).toHaveProperty('boundingBox');
    expect(shadowswitch.elements[0]).toHaveProperty('frameIndex');
    expect(shadowswitch.elements[0]).toHaveProperty('element');
    expect(shadowswitch.elements[0]).toHaveProperty('tagName');
  });

  it('should find switches in iframe but cannot highlight directly', async () => {
    const iframeSwitchInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', "iframe-switch", false, true);
      return result
    `);
    // Should find at least one switch in iframe
    expect(iframeSwitchInfo.elements.length).toBe(1);
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('boundingBox');
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('frameIndex');
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('tagName');
    // Iframe elements should NOT have the element property (can't cross frame boundaries)
    iframeSwitchInfo.elements.forEach(switchInfo => {
      expect(switchInfo.element).toBeFalsy();
      expect(switchInfo.frameIndex).toBeGreaterThanOrEqual(0);
    });
  });
});