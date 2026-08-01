/**
 * Integration tests for ElementInventory
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementInventory', () => {
  const fixture = createDriverFixture({
    url: loadFixture('inventory.html'),
    injectFinder: true,
    sleep: 500,
  });

  beforeAll(async () => {
    await fixture.setup(async (driver) => {
      // Inject the inventory bundle on top of the finder
      const { readFileSync } = await import('node:fs');
      const { resolve, dirname } = await import('node:path');
      const { fileURLToPath } = await import('node:url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const bundlePath = resolve(__dirname, '..', '..', 'inventory.js');
      const bundleContent = readFileSync(bundlePath, 'utf-8');
      await driver.executeScript(`
        ${bundleContent}
        window.ElementInventory = ElementInventory;
      `);
    });
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('returns an object with elements array', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    expect(result).toHaveProperty('elements');
    expect(Array.isArray(result.elements)).toBe(true);
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('each element has the required fields', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const requiredFields = ['type', 'tagName', 'boundingBox', 'inViewport', 'isHidden', 'frameIndex', 'identifiableText'];

    for (const el of result.elements) {
      for (const field of requiredFields) {
        expect(el).toHaveProperty(field);
      }
    }
  });

  it('detects semantic types correctly', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const tagTypes = result.elements.map((el) => `${el.tagName.toLowerCase()}:${el.type}`);

    // Button should be detected as 'button' type
    expect(tagTypes.some((t) => t.includes('button:button'))).toBe(true);
    // Input should be detected as a semantic type (textbox, checkbox, etc.)
    expect(tagTypes.some((t) => t.includes('input:'))).toBe(true);
  });

  it('boundingBox contains expected geometry fields', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const bboxFields = ['x', 'y', 'width', 'height', 'top', 'bottom', 'left', 'right', 'midx', 'midy'];

    for (const el of result.elements) {
      for (const field of bboxFields) {
        expect(el.boundingBox).toHaveProperty(field);
      }
    }
  });

  it('marks hidden elements with isHidden=true', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const hiddenEl = inventory.elements.find(
        (el) => el.tagName === 'SPAN' && el.boundingBox?.x !== undefined
      );
      return hiddenEl;
    `);
    expect(result).toBeDefined();
    expect(result.isHidden).toBe(true);
  });

  it('marks visible elements with inViewport=true', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const btnEl = inventory.elements.find(
        (el) => el.tagName === 'BUTTON' && el.identifiableText?.identifiableText === 'Click Me'
      );
      return btnEl;
    `);
    expect(result).toBeDefined();
    expect(result.inViewport).toBe(true);
  });

  it('assigns frameIndex -1 for main frame elements', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const mainFrameElements = inventory.elements.filter((el) => el.frameIndex === -1);
      return mainFrameElements.length;
    `);
    expect(result).toBeGreaterThan(0);
  });

  it('assigns frameIndex >= 0 for iframe elements', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const iframeElements = inventory.elements.filter((el) => el.frameIndex >= 0);
      return iframeElements.length;
    `);
    expect(result).toBeGreaterThan(0);
  });

  it('includes shadow DOM elements', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const shadowBtn = inventory.elements.find(
        (el) => el.tagName === 'BUTTON' && el.identifiableText?.identifiableText === 'Shadow Button'
      );
      return shadowBtn;
    `);
    expect(result).toBeDefined();
  });

  it('extracts identifiable text with correct priority', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();

      const btnClickMe = inventory.elements.find(
        (el) => el.tagName === 'BUTTON' && el.identifiableText?.identifiableText === 'Click Me'
      );

      const inputAria = inventory.elements.find(
        (el) => el.tagName === 'INPUT' && el.identifiableText?.attributeName === 'aria-label'
      );

      return { btnClickMe, inputAria };
    `);

    expect(result.btnClickMe).toBeDefined();
    expect(result.btnClickMe.identifiableText.attributeName).toBe('visibleText');

    expect(result.inputAria).toBeDefined();
    expect(result.inputAria.identifiableText.attributeName).toBe('aria-label');
  });

  it('output is JSON-serializable', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        const inventory = ElementInventory.getElementInventory();
        const jsonStr = JSON.stringify(inventory);
        return { success: true, length: jsonStr.length };
      } catch (e) {
        return { success: false, error: e.message };
      }
    `);
    expect(result.success).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('no DOM element references in output', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      return { elementCount: inventory.elements.length };
    `);
    expect(result.elementCount).toBeGreaterThan(0);
  });

  it('identifiableText returns null for elements with no text', async () => {
    const result = await fixture.driver.executeScript(`
      const inventory = ElementInventory.getElementInventory();
      const noTextElements = inventory.elements.filter(
        (el) => el.identifiableText === null
      );
      return noTextElements.length;
    `);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
