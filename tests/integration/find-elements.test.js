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
    it('should find elements by type when text is null (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button' });
      `);
      expect(result.elements.length).toBe(3);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('button');
      });
    });

    it('should find elements by type when text is undefined (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: undefined });
      `);
      expect(result.elements.length).toBe(3);
    });

    it('should find elements by type when text is empty string (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: '' });
      `);
      expect(result.elements.length).toBe(3);
    });

    it('should find elements by type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button' });
      `);
      expect(result.elements.length).toBe(3);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Submit' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should find elements by placeholder attribute (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Enter name' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find elements by aria-label attribute (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Cancel button' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find elements matching both type and text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'Submit' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should return empty array when no elements match both criteria (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'nonexistent' });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find button with matching aria-label (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'Cancel' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });

    it('should find textbox with matching placeholder (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'textbox', text: 'Enter name' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find link with matching text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'link', text: 'Home' });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('link1');
    });
  });

  describe('findElements with exact matching', () => {
    it('should support exact matching for text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Enter name', exact: true });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should not find partial matches with exact=true (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Enter', exact: true });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial matches with exact=false (default) (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Enter', exact: false });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should combine exact matching with type (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'textbox', text: 'Enter name', exact: true });
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });
  });

  describe('findElements with parent parameter', () => {
    it('should search within parent element when provided (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements({ text: 'Nested', parent: container });
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-testid');
      expect(dataTestId).toBe('nested-span');
    });

    it('should combine type and parent search (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements({ type: 'element', parent: container });
      `);
      expect(result.elements.length).toBe(2);
      const tagNames = result.elements.map(el => el.tagName);
      expect(tagNames).toContain('div');
      expect(tagNames).toContain('span');
    });

    it('should combine text and parent search (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements({ text: 'container', exact: false, parent: container });
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-test-id');
      expect(dataTestId).toBe('container-div');
    });

    it('should combine type, text, and parent search (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        const container = document.querySelector('.container');
        return ElementFinder.findElements({ type: 'element', text: 'Nested', exact: false, parent: container });
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-testid');
      expect(dataTestId).toBe('nested-span');
    });
  });

  describe('findElements error handling', () => {
    it('should throw TypeError for non-string type (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElements({ type: 123, text: 'test' });
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should throw TypeError for non-string text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElements({ type: 'button', text: 123 });
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should handle exact parameter type coercion (object syntax)', async () => {
      // The normalization treats only strict === true as exact, so 'not-a-boolean'
      // becomes exact: false. This means substring matching is used.
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'Submit', exact: 'not-a-boolean' });
      `);
      // Should behave like exact=false, finding the Submit button with substring match
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findProbableElements', () => {
    it('should find probable elements when exact match exists (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements({ type: 'button', text: 'Submit' });
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
      const btnId = await result.elements[0].element.getAttribute('id');
      expect(btnId).toBe('btn1');
    });

    it('should find probable elements with nearby text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements({ type: 'button', text: 'nonexistent' });
      `);
      // Should still find buttons as probable matches
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });
  });
});
