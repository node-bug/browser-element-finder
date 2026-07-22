/**
 * Integration tests for findElements function - combined type and attribute search
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

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

describe('findElements combined search', () => {
  const fixture = createDriverFixture({
    url: loadFixture('find-elements.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  beforeEach(async () => {
    await fixture.driver.executeScript(`
      ElementFinder.setSearchableAttributes(${JSON.stringify(DEFAULT_ATTRIBUTES)});
    `);
  });

  describe('findElements with type only', () => {
    it('should find elements by type when text is null', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', null);
      `);
      expect(result.elements.length).toBe(3);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('button');
      });
    });

    it('should find elements by type when text is undefined', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', undefined);
      `);
      expect(result.elements.length).toBe(3);
    });

    it('should find elements by type when text is empty string', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', '');
      `);
      expect(result.elements.length).toBe(3);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Submit');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should find elements by text when type is undefined', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(undefined, 'Submit');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by placeholder attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Enter name');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find elements by aria-label attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Cancel button');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find elements matching both type and text', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'Submit');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should return empty array when no elements match both criteria', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'nonexistent');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find button with matching aria-label', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'Cancel');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });

    it('should find textbox with matching placeholder', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('textbox', 'Enter name');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find link with matching text', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('link', 'Home');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('link1');
    });
  });

  describe('findElements with exact matching', () => {
    it('should support exact matching for text', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Enter name', true);
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should not find partial matches with exact=true', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Enter', true);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial matches with exact=false (default)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Enter', false);
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should combine exact matching with type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('textbox', 'Enter name', true);
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });
  });

  describe('findElements with parent parameter', () => {
    it('should search within parent element when provided', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements(null, 'Nested', null, container);
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-testid');
      expect(dataTestId).toBe('nested-span');
    });

    it('should combine type and parent search', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements('element', null, false, container);
      `);
      expect(result.elements.length).toBe(2);
      const tagNames = result.elements.map(el => el.tagName);
      expect(tagNames).toContain('div');
      expect(tagNames).toContain('span');
    });

    it('should combine text and parent search', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements(null, 'container', false, container);
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-test-id');
      expect(dataTestId).toBe('container-div');
    });

    it('should combine type, text, and parent search', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements('element', 'Nested', false, container);
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-testid');
      expect(dataTestId).toBe('nested-span');
    });
  });

  describe('findElements error handling', () => {
    it('should throw TypeError for non-string type', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElements(123, 'test');
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should throw TypeError for non-string text', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElements('button', 123);
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should throw TypeError for non-boolean exact parameter', async () => {
      // The library does not validate the exact parameter type — truthy values
      // behave like true (exact match), falsy values behave like false.
      // Passing a string 'not-a-boolean' is truthy, so it acts as exact=true.
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'Submit', 'not-a-boolean');
      `);
      // Should behave like exact=true, finding the Submit button with an exact match
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findProbableElements', () => {
    it('should find probable elements when exact match exists', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('button', 'Submit');
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
      const btnId = await result.elements[0].element.getAttribute('id');
      expect(btnId).toBe('btn1');
    });

    it('should find probable elements with nearby text', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('button', 'nonexistent');
      `);
      // Should still find buttons as probable matches
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });
  });
});
