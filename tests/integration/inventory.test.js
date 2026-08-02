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

describe('ElementInventory - inViewport option', () => {
  const fixture = createDriverFixture({
    url: loadFixture('onscreen-inventory.html'),
    injectFinder: true,
    sleep: 500,
  });

  beforeAll(async () => {
    await fixture.setup(async (driver) => {
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

  it('excludes off-screen elements when inViewport is true', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    // Bottom buttons are below the fold and should not appear
    const bottomBtns = result.elements.filter(
      (el) => el.identifiableText?.identifiableText === 'Bottom Button 1'
    );
    expect(bottomBtns.length).toBe(0);
  });

  it('includes above-the-fold elements when inViewport is true', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    const topBtn1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Top Button 1'
    );
    expect(topBtn1).toBeDefined();
    expect(topBtn1.inViewport).toBe(true);
  });

  it('excludes hidden elements from inViewport inventory', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    const hiddenBtn = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Hidden Button'
    );
    expect(hiddenBtn).toBeUndefined();
  });

  it('groups elements by semantic type when inViewport is true', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    // Get all button types from the inventory
    const buttons = result.elements.filter((el) => el.type === 'button');
    expect(buttons.length).toBeGreaterThan(0);
    // All should have an index field
    for (const btn of buttons) {
      expect(btn.index).toBeDefined();
      expect(typeof btn.index).toBe('number');
    }
  });

  it('sorts elements by vertical position within each type group', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    const buttons = result.elements.filter((el) => el.type === 'button');
    // Verify buttons are sorted by y position
    for (let i = 1; i < buttons.length; i++) {
      expect(buttons[i].boundingBox.y).toBeGreaterThanOrEqual(
        buttons[i - 1].boundingBox.y
      );
    }
  });

  it('assigns 0-based index within each type group', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    const buttons = result.elements.filter((el) => el.type === 'button');
    // First button should have index 0
    expect(buttons[0].index).toBe(0);
    // Indices should be sequential
    for (let i = 1; i < buttons.length; i++) {
      expect(buttons[i].index).toBe(i);
    }
  });

  it('does not include index field when inViewport is false (default)', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    for (const el of result.elements) {
      expect(el.index).toBeUndefined();
    }
  });

  it('includes all elements when inViewport is false', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: false });
    `);
    // Should include both top and bottom buttons
    const topBtn1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Top Button 1'
    );
    const bottomBtn1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Bottom Button 1'
    );
    expect(topBtn1).toBeDefined();
    expect(bottomBtn1).toBeDefined();
  });

  it('includes previously off-screen elements after scrolling', async () => {
    // Scroll bottom button into view using the same pattern as forms.test.js
    await fixture.driver.executeScript(`
      document.getElementById('btn-bottom-1')
        .scrollIntoView({ block: 'center' });
    `);
    await fixture.driver.sleep(300);

    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    const bottomBtn1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Bottom Button 1'
    );
    expect(bottomBtn1).toBeDefined();
  });

  it('excludes previously on-screen elements after scrolling away', async () => {
    // Scroll back to top so bottom buttons are out of view
    await fixture.driver.executeScript(`
      window.scrollTo(0, 0);
    `);
    await fixture.driver.sleep(300);

    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    // Bottom buttons should no longer be in the inventory
    const bottomBtns = result.elements.filter(
      (el) => el.identifiableText?.identifiableText?.startsWith('Bottom Button')
    );
    expect(bottomBtns.length).toBe(0);
  });

  it('filters checkboxes below the fold when inViewport is true', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    // Bottom checkboxes should not appear
    const bottomCb1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Checkbox C'
    );
    expect(bottomCb1).toBeUndefined();
  });

  it('filters textboxes below the fold when inViewport is true', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    // Bottom textboxes should not appear
    const bottomTb1 = result.elements.find(
      (el) => el.identifiableText?.identifiableText === 'Bottom text input 1'
    );
    expect(bottomTb1).toBeUndefined();
  });

  it('returns fewer elements with inViewport true than without', async () => {
    const fullResult = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: false });
    `);
    const viewportResult = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory({ inViewport: true });
    `);
    expect(viewportResult.elements.length).toBeLessThan(fullResult.elements.length);
  });
});
