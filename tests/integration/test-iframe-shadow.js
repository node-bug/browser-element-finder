/**
 * Consolidated Iframe and Shadow DOM Tests
 * Combines tests from: test-iframe.js, test-shadow-dom.js, test-switches.js
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Iframe and Shadow DOM Consolidated Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'iframe-test.html');
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

  describe('Iframe Tests', () => {
    it('should find all checkboxes including those in iframes by default', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('checkbox', null, false, true);
      `);
      expect(result.elements.length).toBe(3);
      
      const mainFrameElements = result.elements.filter(e => e.element);
      const iframeElements = result.elements.filter(e => !e.element);
      
      expect(mainFrameElements.length).toBe(1);
      expect(iframeElements.length).toBe(2);
      
      const mainCheckboxId = await mainFrameElements[0].element.getAttribute('id');
      expect(mainCheckboxId).toBe('main-checkbox');
    });

    it('should include frameIndex in results', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement('checkbox');
      `);
      
      for (const el of result.elements) {
        expect(el.frameIndex).toBeDefined();
        expect(typeof el.frameIndex).toBe('number');
      }
      
      const mainCheckbox = result.elements.find(e => e.element);
      expect(mainCheckbox.frameIndex).toBe(-1);
      
      const iframeCheckboxes = result.elements.filter(e => !e.element);
      for (const el of iframeCheckboxes) {
        expect(el.frameIndex).toBe(0);
      }
    });

    it('should find elements by text including those in iframes by default', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.findElement(null, 'Iframe Checkbox');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });
});

describe('Shadow DOM Tests', () => {
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
    bboxInfo.forEach(item => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
    });
  });
});

describe('Switches Tests', () => {
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
    expect(switchDetails.elements.length).toBe(7);
    expect(switchDetails.elements[0]).toHaveProperty('boundingBox');
    expect(switchDetails.elements[0]).toHaveProperty('frameIndex');
    expect(switchDetails.elements[0]).toHaveProperty('element');
    expect(switchDetails.elements[0]).toHaveProperty('tagName');
  });

  it('should highlight all switches', async () => {
    await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      const mainFrameElements = result.elements.filter(e => e.element);
      ElementFinder.highlight(mainFrameElements.map(e => e.element), 'green', 3);
    `);
  });

  it('should return bounding box info for switches', async () => {
    const switchInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result
    `);
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
    expect(iframeSwitchInfo.elements.length).toBe(1);
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('boundingBox');
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('frameIndex');
    expect(iframeSwitchInfo.elements[0]).toHaveProperty('tagName');
    iframeSwitchInfo.elements.forEach(switchInfo => {
      expect(switchInfo.element).toBeFalsy();
      expect(switchInfo.frameIndex).toBeGreaterThanOrEqual(0);
    });
  });
});