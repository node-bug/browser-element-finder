/**
 * Test Interactive Elements Finder
 * Tests that interactive elements in interactive-elements.html can be identified
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Interactive Elements Finder Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const htmlPath = join(__dirname, 'fixtures', 'interactive-elements.html');
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
    await driver.quit();
  });

  it('should find all links', async () => {
    const linkDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('link');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(linkDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all buttons', async () => {
    const buttonDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(buttonDetails.count).toBeGreaterThanOrEqual(4);
  });

  it('should find all sliders', async () => {
    const sliderDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('slider');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(sliderDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all file inputs', async () => {
    const fileDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('file');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(fileDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all lists', async () => {
    const listDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('list');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(listDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all listitems', async () => {
    const listitemDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('listitem');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(listitemDetails.count).toBeGreaterThanOrEqual(4);
  });

  it('should find all menus', async () => {
    const menuDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('menu');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(menuDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all menuitems', async () => {
    const menuitemDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('menuitem');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(menuitemDetails.count).toBeGreaterThanOrEqual(4);
  });

  it('should find all toolbars', async () => {
    const toolbarDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('toolbar');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(toolbarDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all images', async () => {
    const imageDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('image');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(imageDetails.count).toBeGreaterThanOrEqual(2);
  });

  it('should find all dialogs (including hidden)', async () => {
    const dialogDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('dialog', null, false, true);
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    expect(dialogDetails.count).toBeGreaterThanOrEqual(1);
  });
});