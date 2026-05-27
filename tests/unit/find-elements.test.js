/**
 * Unit tests for findElements function - combined type and attribute search
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  setSearchableAttributes,
  findElements
} from '../../src/element-finder.js';

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
  let window;
  let document;

  beforeAll(() => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="btn1" data-test-id="submit-btn">Submit</button>
          <button id="btn2" aria-label="Cancel button">Cancel</button>
          <button id="btn3" title="Click Me">Click Me</button>
          <input type="text" id="txt1" placeholder="Enter name" />
          <input type="text" id="txt2" placeholder="Enter email" data-testid="email-input" />
          <input type="checkbox" id="chk1" name="agree" />
          <input type="radio" id="radio1" name="group1" />
          <a href="/page1" id="link1" title="Home Link">Home</a>
          <a href="/page2" id="link2">About</a>
          <select id="dropdown1" aria-label="Choose option">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
          <textarea id="textarea1" placeholder="Enter description">Some text</textarea>
          <div class="container" data-test-id="container-div">
            <span data-testid="nested-span">Nested text</span>
          </div>
        </body>
      </html>
    `;

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously'
    });

    window = dom.window;
    document = window.document;

    global.document = document;
    global.Node = window.Node;
    global.window = window;
  });

  afterAll(() => {
    window.close();
    delete global.window;
    delete global.document;
    delete global.Node;
  });

  beforeEach(() => {
    setSearchableAttributes([...DEFAULT_ATTRIBUTES]);
  });

  describe('findElements with type only', () => {
    it('should find elements by type when text is null', () => {
      const result = findElements('button', null);
      expect(result.elements.length).toBe(3);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('button');
      });
    });

    it('should find elements by type when text is undefined', () => {
      const result = findElements('button', undefined);
      expect(result.elements.length).toBe(3);
    });

    it('should find elements by type when text is empty string', () => {
      const result = findElements('button', '');
      expect(result.elements.length).toBe(3);
    });

    it('should default to "element" type when type is null', () => {
      const result = findElements(null, '');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should default to "element" type when type is undefined', () => {
      const result = findElements(undefined, '');
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null', () => {
      const result = findElements(null, 'Submit');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');
    });

    it('should find elements by text when type is undefined', () => {
      const result = findElements(undefined, 'Submit');
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by placeholder attribute', () => {
      const result = findElements(null, 'Enter name');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });

    it('should find elements by aria-label attribute', () => {
      const result = findElements(null, 'Cancel button');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find elements matching both type and text', () => {
      const result = findElements('button', 'Submit');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');
    });

    it('should return empty array when no elements match both criteria', () => {
      const result = findElements('button', 'nonexistent');
      expect(result.elements.length).toBe(0);
    });

    it('should find button with matching aria-label', () => {
      const result = findElements('button', 'Cancel');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');
    });

    it('should find textbox with matching placeholder', () => {
      const result = findElements('textbox', 'Enter name');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });

    it('should find link with matching text', () => {
      const result = findElements('link', 'Home');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('link1');
    });
  });

  describe('findElements with exact matching', () => {
    it('should support exact matching for text', () => {
      const result = findElements(null, 'Enter name', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });

    it('should not find partial matches with exact=true', () => {
      const result = findElements(null, 'Enter', true);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial matches with exact=false (default)', () => {
      const result = findElements(null, 'Enter', false);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should combine exact matching with type', () => {
      const result = findElements('textbox', 'Enter name', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });
  });

  describe('findElements with parent parameter', () => {
    it('should search within parent element when provided', () => {
      const container = document.querySelector('.container');
      const result = findElements(null, 'Nested', null, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-testid')).toBe('nested-span');
    });

    it('should combine type and parent search', () => {
      const container = document.querySelector('.container');
      const result = findElements('element', null, false, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].tagName).toBe('span');
    });

    it('should combine text and parent search', () => {
      const container = document.querySelector('.container');
      const result = findElements(null, 'container', false, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-test-id')).toBe('container-div');
    });

    it('should combine type, text, and parent search', () => {
      const container = document.querySelector('.container');
      const result = findElements('element', 'Nested', false, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-testid')).toBe('nested-span');
    });
  });

  describe('findElements error handling', () => {
    it('should throw TypeError for non-string type', () => {
      expect(() => findElements(123, '')).toThrow(TypeError);
    });

    it('should throw TypeError for non-string text', () => {
      expect(() => findElements(null, 123)).toThrow(TypeError);
    });

    it('should return empty array for unknown type', () => {
      const result = findElements('unknown-type', '');
      expect(result.elements).toEqual([]);
    });
  });

  describe('findElements return format', () => {
    it('should return elements with boundingBox and tagName', () => {
      const result = findElements('button', 'Submit');
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
    });

    it('should return innermost matches only', () => {
      const result = findElements(null, 'container');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-test-id')).toBe('container-div');
    });
  });
});