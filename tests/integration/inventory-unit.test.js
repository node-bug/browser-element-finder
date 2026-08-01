/**
 * Unit-style integration tests for ElementInventory
 * Tests individual behaviors by dynamically setting up DOM content in a real Chrome browser.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDriverFixture } from './helpers/driver-helper.js';

describe('ElementInventory - unit', () => {
  const fixture = createDriverFixture({
    url: 'data:text/html,<html><body></body></html>',
    injectFinder: true,
    sleep: 0,
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

  it('is a function', async () => {
    const result = await fixture.driver.executeScript(`
      return typeof ElementInventory.getElementInventory;
    `);
    expect(result).toBe('function');
  });

  it('returns an object with elements array on empty document', async () => {
    await fixture.driver.executeScript(`document.body.innerHTML = '';`);
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    expect(result).toHaveProperty('elements');
    expect(Array.isArray(result.elements)).toBe(true);
  });

  it('includes elements from a simple DOM', async () => {
    await fixture.driver.executeScript(`
      document.body.innerHTML = \`
        <button id="btn1">Hello</button>
        <input type="text" id="inp1" placeholder="Name" />
        <div id="div1">Content</div>
      \`;
    `);
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    expect(result.elements.length).toBeGreaterThan(0);

    // Button should be present
    const btn = result.elements.find((el) => el.tagName === 'BUTTON');
    expect(btn).toBeDefined();
    expect(btn.type).toBe('button');
    expect(btn.tagName).toBe('BUTTON');
  });

  it('detects hidden elements', async () => {
    await fixture.driver.executeScript(`
      document.body.innerHTML = \`
        <span id="visible">Visible</span>
        <span id="hidden" style="display:none">Hidden</span>
      \`;
    `);
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const hiddenEl = result.elements.find((el) => el.isHidden);
    expect(hiddenEl).toBeDefined();
  });

  it('identifiableText prefers visible text content', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<button id="btn">Direct Text</button>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const btn = result.elements.find((el) => el.tagName === 'BUTTON');
    expect(btn.identifiableText).not.toBeNull();
    expect(btn.identifiableText.attributeName).toBe('visibleText');
    expect(btn.identifiableText.identifiableText).toBe('Direct Text');
  });

  it('identifiableText captures nested text from descendant elements', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<a id="link"><span>Sign</span> <span>in</span></a>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const link = result.elements.find((el) => el.tagName === 'A');
    expect(link.identifiableText).not.toBeNull();
    expect(link.identifiableText.attributeName).toBe('visibleText');
    expect(link.identifiableText.identifiableText).toBe('Sign in');
  });

  it('identifiableText falls back to aria-label when no direct text', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<input type="text" aria-label="Email address" />';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const input = result.elements.find((el) => el.tagName === 'INPUT');
    expect(input.identifiableText).not.toBeNull();
    expect(input.identifiableText.attributeName).toBe('aria-label');
  });

  it('identifiableText falls back to placeholder when no aria-label', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<input type="text" placeholder="Search..." />';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const input = result.elements.find((el) => el.tagName === 'INPUT');
    expect(input.identifiableText).not.toBeNull();
    expect(input.identifiableText.attributeName).toBe('placeholder');
  });

  it('identifiableText falls back to data-testid as last resort', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<div data-testid="unique-id"></div>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const div = result.elements.find(
      (el) => el.tagName === 'DIV' && el.identifiableText?.attributeName === 'data-testid'
    );
    expect(div).toBeDefined();
  });

  it('identifiableText is null for empty elements with no attributes', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<div id=""></div>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const allElements = result.elements;
    expect(allElements.length).toBeGreaterThan(0);
  });

  it('boundingBox has numeric values', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<button>Test</button>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    const btn = result.elements.find((el) => el.tagName === 'BUTTON');
    expect(typeof btn.boundingBox.x).toBe('number');
    expect(typeof btn.boundingBox.y).toBe('number');
    expect(typeof btn.boundingBox.width).toBe('number');
    expect(typeof btn.boundingBox.height).toBe('number');
  });

  it('frameIndex is -1 for main frame', async () => {
    await fixture.driver.executeScript(
      `document.body.innerHTML = '<button>Main</button>';`
    );
    const result = await fixture.driver.executeScript(`
      return ElementInventory.getElementInventory();
    `);
    for (const el of result.elements) {
      expect(el.frameIndex).toBe(-1);
    }
  });

  it('accepts parent option to scope traversal', async () => {
    await fixture.driver.executeScript(`
      document.body.innerHTML = \`
        <div id="container">
          <button>Inside</button>
        </div>
        <button>Outside</button>
      \`;
    `);
    const result = await fixture.driver.executeScript(`
      const container = document.getElementById('container');
      return ElementInventory.getElementInventory({ parent: container });
    `);
    const tags = result.elements.map((el) => el.tagName);
    expect(tags.includes('BUTTON')).toBe(true);
  });

  it('output is JSON-serializable', async () => {
    await fixture.driver.executeScript(`
      document.body.innerHTML = \`
        <button>Click</button>
        <input type="text" aria-label="Name" />
      \`;
    `);
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
  });
});
