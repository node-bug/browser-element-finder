/**
 * Integration tests for ElementFinder attribute matching
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to re-inject the ElementFinder bundle into the current page
async function reinjectFinder(driver, attributes) {
  const finderPath = join(__dirname, '..', '..', 'index.js');
  const finderCode = readFileSync(finderPath, 'utf8');
  await driver.executeScript(`
    ${finderCode}
    window.ElementFinder = ElementFinder;
  `);
  if (attributes) {
    await driver.executeScript(`
      ElementFinder.setSearchableAttributes(${JSON.stringify(attributes)});
    `);
  }
}

const DEFAULT_ATTRIBUTES = [
  "placeholder",
  "value",
  "data-test-id",
  "data-testid",
  "id",
  "resource-id",
  "name",
  "aria-label",
  "hint",
  "title",
  "tooltip",
  "alt",
  "src",
  "aria-labelledby"
];

describe('ElementFinder Attribute Tests', () => {
  const fixture = createDriverFixture({
    url: loadFixture('attributes.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  // Reload page + re-inject finder before every test to handle DOM mutations
  beforeEach(async () => {
    await fixture.driver.get(fixture.url);
    await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
  });

  describe('setSearchableAttributes', () => {
    it('should set custom searchable attributes', async () => {
      await fixture.driver.executeScript(`
        ElementFinder.setSearchableAttributes(['id', 'class', 'custom-attr']);
      `);
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getSearchableAttributes();
      `);
      expect(attrs).toEqual(['id', 'class', 'custom-attr']);
    });

    it('should throw TypeError for non-array input', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.setSearchableAttributes('not-an-array');
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });
  });

  describe('getSearchableAttributes', () => {
    it('should return a copy of searchable attributes', async () => {
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getSearchableAttributes();
      `);
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
    });

    it('should return a new array each time', async () => {
      const result = await fixture.driver.executeScript(`
        const a1 = ElementFinder.getSearchableAttributes();
        const a2 = ElementFinder.getSearchableAttributes();
        return a1 !== a2;
      `);
      expect(result).toBe(true);
    });
  });

  describe('getSearchableAttributeValues', () => {
    it('should return current values for searchable attributes on an element', async () => {
      const values = await fixture.driver.executeScript(`
        const input = document.getElementById('txt2');
        return ElementFinder.getSearchableAttributeValues(input);
      `);
      expect(values).toEqual({
        placeholder: 'Enter email',
        'data-testid': 'email-input',
        id: 'txt2'
      });
    });

    it('should exclude missing, empty, and non-searchable attributes', async () => {
      const values = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('placeholder', '');
        input.setAttribute('data-testid', '');
        input.setAttribute('custom-attr', 'ignored');
        input.setAttribute('aria-label', 'Email Address');
        return ElementFinder.getSearchableAttributeValues(input);
      `);
      expect(values).toEqual({
        'aria-label': 'Email Address'
      });
    });

    it('should respect custom searchable attributes', async () => {
      const values = await fixture.driver.executeScript(`
        ElementFinder.setSearchableAttributes(['data-qa', 'id']);
        const el = document.createElement('button');
        el.setAttribute('id', 'save');
        el.setAttribute('data-qa', 'save-button');
        el.setAttribute('aria-label', 'Save changes');
        return ElementFinder.getSearchableAttributeValues(el);
      `);
      expect(values).toEqual({
        'data-qa': 'save-button',
        id: 'save'
      });
    });

    it('should return an empty object for null or non-element nodes', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.getSearchableAttributeValues(null),
          ElementFinder.getSearchableAttributeValues(document.createTextNode('not an element'))
        ];
      `);
      expect(result).toEqual([{}, {}]);
    });
  });

  describe('matchesAttribute', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
    it('should return false for null element', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.matchesAttribute(null, 'test');
      `);
      expect(result).toBe(false);
    });

    it('should return true for empty value', async () => {
      const result = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        return [
          ElementFinder.matchesAttribute(el, ''),
          ElementFinder.matchesAttribute(el, null),
          ElementFinder.matchesAttribute(el, undefined)
        ];
      `);
      expect(result).toEqual([true, true, true]);
    });

    it('should match placeholder attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'Enter name'),
          ElementFinder.matchesAttribute(input, 'Enter'),
          ElementFinder.matchesAttribute(input, 'name'),
          ElementFinder.matchesAttribute(input, 'other')
        ];
      `);
      expect(result).toEqual([true, true, true, false]);
    });

    it('should match data-testid attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt2');
        return [
          ElementFinder.matchesAttribute(input, 'email-input'),
          ElementFinder.matchesAttribute(input, 'email')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match id attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'btn1'),
          ElementFinder.matchesAttribute(button, 'btn')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match aria-label attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn2');
        return [
          ElementFinder.matchesAttribute(button, 'Cancel button'),
          ElementFinder.matchesAttribute(button, 'Cancel')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match title attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn3');
        return ElementFinder.matchesAttribute(button, 'Click Me');
      `);
      expect(result).toBe(true);
    });

    it('should support exact matching for attributes', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'Enter name', true),
          ElementFinder.matchesAttribute(input, 'Enter', true),
          ElementFinder.matchesAttribute(input, 'name', true)
        ];
      `);
      expect(result).toEqual([true, false, false]);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'Submit', true),
          ElementFinder.matchesAttribute(button, 'Sub', true),
          ElementFinder.matchesAttribute(button, 'mit', true)
        ];
      `);
      expect(result).toEqual([true, false, false]);
    });

    it('should be case-sensitive', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'ENTER NAME'),
          ElementFinder.matchesAttribute(input, 'Enter name')
        ];
      `);
      expect(result).toEqual([false, true]);
    });

    it('should match text content', async () => {
      const result = await fixture.driver.executeScript(`
        const div = document.querySelector('.container');
        return [
          ElementFinder.matchesAttribute(div, 'Nested'),
          ElementFinder.matchesAttribute(div, 'Nested text')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match element text content', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'Submit'),
          ElementFinder.matchesAttribute(button, 'Submit ')
        ];
      `);
      expect(result).toEqual([true, false]);
    });
  });

  describe('getBoundingBox', () => {
    it('should return bounding box with correct properties', async () => {
      const box = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = '100px';
        el.style.top = '50px';
        el.style.width = '200px';
        el.style.height = '100px';
        document.body.appendChild(el);
        return ElementFinder.getBoundingBox(el);
      `);
      expect(box.x).toBeDefined();
      expect(box.y).toBeDefined();
      expect(box.width).toBeDefined();
      expect(box.height).toBeDefined();
      expect(box.midx).toBeDefined();
      expect(box.midy).toBeDefined();
    });
  });

  describe('getAllElements', () => {
    it('should return all elements including shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        const elements = ElementFinder.getAllElements(document);
        return {
          length: elements.length,
          hasButton: elements.some(el => el.tagName === 'BUTTON'),
          hasInput: elements.some(el => el.tagName === 'INPUT')
        };
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result.hasButton).toBe(true);
      expect(result.hasInput).toBe(true);
    });

    it('should exclude SCRIPT and STYLE elements', async () => {
      const result = await fixture.driver.executeScript(`
        const elements = ElementFinder.getAllElements(document);
        return {
          hasScript: elements.some(el => el.tagName === 'SCRIPT'),
          hasStyle: elements.some(el => el.tagName === 'STYLE')
        };
      `);
      expect(result.hasScript).toBe(false);
      expect(result.hasStyle).toBe(false);
    });

    it('should return empty array for null root', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.getAllElements(null);
      `);
      expect(result).toEqual([]);
    });
  });

  describe('getAllFrames', () => {
    it('should return main frame', async () => {
      const result = await fixture.driver.executeScript(`
        const frames = ElementFinder.getAllFrames(window);
        return {
          length: frames.length,
          isMainFrame: frames[0].isMainFrame,
          frameIndex: frames[0].frameIndex
        };
      `);
      expect(result.length).toBe(1);
      expect(result.isMainFrame).toBe(true);
      expect(result.frameIndex).toBe(-1);
    });
  });

  describe('findElementsByAttribute', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
    it('should throw TypeError for non-string value', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElementsByAttribute({ value: 123 });
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should return all elements for empty value', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: '' }).elements.length;
      `);
      expect(result).toBeGreaterThan(0);
    });

    it('should find elements by placeholder attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Enter name' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find elements by data-testid attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'email-input' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt2');
    });

    it('should find elements by id attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'btn1' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should find elements by aria-label attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Cancel button' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });

    it('should find elements by title attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Click Me' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn3');
    });

    it('should support exact matching for attributes', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.findElementsByAttribute({ value: 'Enter name', exact: true }).elements.length,
          ElementFinder.findElementsByAttribute({ value: 'Enter', exact: true }).elements.length,
          ElementFinder.findElementsByAttribute({ value: 'Enter', exact: false }).elements.length
        ];
      `);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(3);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.findElementsByAttribute({ value: 'Submit', exact: true }).elements.length,
          ElementFinder.findElementsByAttribute({ value: 'Sub', exact: true }).elements.length,
          ElementFinder.findElementsByAttribute({ value: 'Sub', exact: false }).elements.length
        ];
      `);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(1);
    });

    it('should return innermost matches only', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'container' });
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-test-id');
      expect(dataTestId).toBe('container-div');
    });

    it('should return elements with bounding box and tagName', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'btn1' });
      `);
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
    });
  });

  describe('getValidAttributes', () => {
    it('should return array of valid attribute names', async () => {
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getValidAttributes();
      `);
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
      expect(attrs).toContain('data-test-id');
      expect(attrs).toContain('id');
      expect(attrs).toContain('aria-label');
    });
  });

  describe('highlight/unhighlight', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
    it('should highlight elements', async () => {
      const result = await fixture.driver.executeScript(`
        const btn = document.getElementById('btn1');
        ElementFinder.highlight([btn], 'red', 2);
        return btn.style.outline;
      `);
      // Chrome serializes outline as "{color} {style} {width}" (e.g., "red solid 2px")
      expect(result).toMatch(/red\s+solid\s+2px/);
    });

    it('should unhighlight elements', async () => {
      const result = await fixture.driver.executeScript(`
        const btn = document.getElementById('btn1');
        btn.style.outline = '2px solid red';
        ElementFinder.unhighlight([btn]);
        return btn.style.outline;
      `);
      expect(result).toBe('');
    });

    it('should handle highlight with result wrapper format', async () => {
      const result = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByAttribute({ value: 'btn1' });
        ElementFinder.highlight(result, 'blue', 2);
        const btn = document.getElementById('btn1');
        return btn.style.outline;
      `);
      expect(result).toMatch(/blue\s+solid\s+2px/);
    });

    it('should handle null input without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight(null);
        ElementFinder.unhighlight(null);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle undefined input without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight(undefined);
        ElementFinder.unhighlight(undefined);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle empty array without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight([]);
        ElementFinder.unhighlight([]);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle empty object without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight({});
        ElementFinder.unhighlight({});
        return 'ok';
      `);
      expect(result).toBe('ok');
    });
  });
});
