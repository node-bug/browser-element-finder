/**
 * Unit tests for ElementFinderByAttribute Node.js module
 * These tests run in Node.js and provide code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  setSearchableAttributes,
  getSearchableAttributes,
  matchesAttribute,
  getBoundingBox,
  getAllElements,
  getAllFrames,
  findElementByAttributes,
  getValidAttributes,
  highlight,
  unhighlight
} from '../../src/element-finder-by-attribute.js';

// Default searchable attributes to reset state between tests
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

describe('ElementFinderByAttribute Node.js Module Tests', () => {
  let window;
  let document;

  beforeAll(() => {
    // Create jsdom instance
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
          <script>console.log('test')</script>
          <style>.test { color: red; }</style>
          <!-- Table for testing -->
          <table id="test-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alice</td>
                <td>30</td>
              </tr>
            </tbody>
          </table>
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

    // Set up global document and Node for getAllElements
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
    // Reset searchable attributes to default before each test
    setSearchableAttributes([...DEFAULT_ATTRIBUTES]);
  });

  describe('setSearchableAttributes', () => {
    it('should set custom searchable attributes', () => {
      setSearchableAttributes(['id', 'class', 'custom-attr']);
      expect(getSearchableAttributes()).toEqual(['id', 'class', 'custom-attr']);
    });

    it('should throw TypeError for non-array input', () => {
      expect(() => setSearchableAttributes('not-an-array')).toThrow(TypeError);
      expect(() => setSearchableAttributes(null)).toThrow(TypeError);
      expect(() => setSearchableAttributes(123)).toThrow(TypeError);
    });
  });

  describe('getSearchableAttributes', () => {
    it('should return a copy of searchable attributes', () => {
      const attrs = getSearchableAttributes();
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
    });

    it('should return a new array each time', () => {
      const attrs1 = getSearchableAttributes();
      const attrs2 = getSearchableAttributes();
      expect(attrs1).not.toBe(attrs2);
    });
  });

  describe('matchesAttribute', () => {
    it('should return false for null element', () => {
      expect(matchesAttribute(null, 'test')).toBe(false);
    });

    it('should return true for empty value', () => {
      const el = document.createElement('div');
      expect(matchesAttribute(el, '')).toBe(true);
      expect(matchesAttribute(el, null)).toBe(true);
      expect(matchesAttribute(el, undefined)).toBe(true);
    });

    it('should match placeholder attribute', () => {
      const input = document.getElementById('txt1');
      expect(matchesAttribute(input, 'Enter name')).toBe(true);
      expect(matchesAttribute(input, 'Enter')).toBe(true);
      expect(matchesAttribute(input, 'name')).toBe(true);
      expect(matchesAttribute(input, 'other')).toBe(false);
    });

    it('should match data-testid attribute', () => {
      const input = document.getElementById('txt2');
      expect(matchesAttribute(input, 'email-input')).toBe(true);
      expect(matchesAttribute(input, 'email')).toBe(true);
    });

    it('should match id attribute', () => {
      const button = document.getElementById('btn1');
      expect(matchesAttribute(button, 'btn1')).toBe(true);
      expect(matchesAttribute(button, 'btn')).toBe(true);
    });

    it('should match aria-label attribute', () => {
      const button = document.getElementById('btn2');
      expect(matchesAttribute(button, 'Cancel button')).toBe(true);
      expect(matchesAttribute(button, 'Cancel')).toBe(true);
    });

    it('should match title attribute', () => {
      const button = document.getElementById('btn3');
      expect(matchesAttribute(button, 'Click Me')).toBe(true);
    });

    it('should support exact matching for attributes', () => {
      const input = document.getElementById('txt1');
      // Exact match should work
      expect(matchesAttribute(input, 'Enter name', true)).toBe(true);
      // Partial match should fail with exact=true
      expect(matchesAttribute(input, 'Enter', true)).toBe(false);
      expect(matchesAttribute(input, 'name', true)).toBe(false);
    });

    it('should support exact matching for text content', () => {
      const button = document.getElementById('btn1');
      // Exact match should work
      expect(matchesAttribute(button, 'Submit', true)).toBe(true);
      // Partial match should fail with exact=true
      expect(matchesAttribute(button, 'Sub', true)).toBe(false);
      expect(matchesAttribute(button, 'mit', true)).toBe(false);
    });

    it('should support exact matching for nested text content', () => {
      const div = document.querySelector('.container');
      // Exact match on full text content
      expect(matchesAttribute(div, 'Nested text', true)).toBe(true);
      // Partial match should fail with exact=true
      expect(matchesAttribute(div, 'Nested', true)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const input = document.getElementById('txt1');
      expect(matchesAttribute(input, 'ENTER NAME')).toBe(false);
      expect(matchesAttribute(input, 'Enter name')).toBe(true);
    });

    it('should match text content', () => {
      const div = document.querySelector('.container');
      expect(matchesAttribute(div, 'Nested')).toBe(true);
      expect(matchesAttribute(div, 'Nested text')).toBe(true);
    });

    it('should match element text content', () => {
      const button = document.getElementById('btn1');
      expect(matchesAttribute(button, 'Submit')).toBe(true);
      expect(matchesAttribute(button, 'Submit ')).toBe(false);
    });
  });

  describe('getBoundingBox', () => {
    it('should return bounding box with correct properties', () => {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = '100px';
      el.style.top = '50px';
      el.style.width = '200px';
      el.style.height = '100px';
      document.body.appendChild(el);

      const box = getBoundingBox(el);
      expect(box.tagName).toBe('div');
      expect(box.x).toBeDefined();
      expect(box.y).toBeDefined();
      expect(box.width).toBeDefined();
      expect(box.height).toBeDefined();
      expect(box.midx).toBeDefined();
      expect(box.midy).toBeDefined();
    });
  });

  describe('getAllElements', () => {
    it('should return all elements including shadow DOM', () => {
      const elements = getAllElements(document);
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some(el => el.tagName === 'BUTTON')).toBe(true);
      expect(elements.some(el => el.tagName === 'INPUT')).toBe(true);
    });

    it('should exclude SCRIPT and STYLE elements', () => {
      const elements = getAllElements(document);
      expect(elements.some(el => el.tagName === 'SCRIPT')).toBe(false);
      expect(elements.some(el => el.tagName === 'STYLE')).toBe(false);
    });

    it('should return empty array for null root', () => {
      expect(getAllElements(null)).toEqual([]);
    });
  });

  describe('getAllFrames', () => {
    it('should return main frame', () => {
      const frames = getAllFrames(window);
      expect(frames.length).toBe(1);
      expect(frames[0].isMainFrame).toBe(true);
      expect(frames[0].frameIndex).toBe(-1);
    });
  });

  describe('findElementByAttributes', () => {
    it('should throw TypeError for non-string value', () => {
      expect(() => findElementByAttributes(123)).toThrow(TypeError);
      expect(() => findElementByAttributes(null)).not.toThrow();
      expect(() => findElementByAttributes(undefined)).not.toThrow();
    });

    it('should return all elements for empty value', () => {
      const result = findElementByAttributes('');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find elements by placeholder attribute', () => {
      const result = findElementByAttributes('Enter name');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });

    it('should find elements by data-testid attribute', () => {
      const result = findElementByAttributes('email-input');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt2');
    });

    it('should find elements by id attribute', () => {
      const result = findElementByAttributes('btn1');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');
    });

    it('should find elements by aria-label attribute', () => {
      const result = findElementByAttributes('Cancel button');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');
    });

    it('should find elements by title attribute', () => {
      const result = findElementByAttributes('Click Me');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn3');
    });

    it('should support exact matching for attributes', () => {
      // Exact match should find the element
      const result = findElementByAttributes('Enter name', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');

      // Partial match should not find anything with exact=true
      const result2 = findElementByAttributes('Enter', true);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = findElementByAttributes('Enter', false);
      expect(result3.elements.length).toBe(3);
    });

    it('should support exact matching for text content', () => {
      // Exact match on button text
      const result = findElementByAttributes('Submit', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');

      // Partial match should not find with exact=true
      const result2 = findElementByAttributes('Sub', true);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = findElementByAttributes('Sub', false);
      expect(result3.elements.length).toBe(1);
    });

    it('should support exact matching for aria-label', () => {
      // Exact match on aria-label
      const result = findElementByAttributes('Cancel button', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');

      // Partial match should not find with exact=true
      const result2 = findElementByAttributes('Cancel', true);
      expect(result2.elements.length).toBe(1);

      // Partial match should find with exact=false (default)
      const result3 = findElementByAttributes('Cancel', false);
      expect(result3.elements.length).toBe(1);
    });

    it('should return innermost matches only', () => {
      const result = findElementByAttributes('container');
      // Should match the div with data-test-id="container-div"
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-test-id')).toBe('container-div');
    });

    it('should return elements with bounding box and tagName', () => {
      const result = findElementByAttributes('btn1');
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
    });
  });

  describe('getValidAttributes', () => {
    it('should return array of valid attribute names', () => {
      const attrs = getValidAttributes();
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
      expect(attrs).toContain('data-test-id');
      expect(attrs).toContain('id');
      expect(attrs).toContain('aria-label');
    });
  });

  describe('highlight/unhighlight', () => {
    it('should highlight elements', () => {
      const btn = document.getElementById('btn1');
      highlight([btn], 'red', 2);
      expect(btn.style.outline).toBe('2px solid red');
    });

    it('should unhighlight elements', () => {
      const btn = document.getElementById('btn1');
      btn.style.outline = '2px solid red';
      unhighlight([btn]);
      expect(btn.style.outline).toBe('');
    });

    it('should handle highlight with result wrapper format', () => {
      const result = findElementByAttributes('btn1');
      highlight(result, 'blue', 2);
      const btn = document.getElementById('btn1');
      expect(btn.style.outline).toBe('2px solid blue');
    });

    it('should handle null input without throwing', () => {
      expect(() => highlight(null)).not.toThrow();
      expect(() => unhighlight(null)).not.toThrow();
    });

    it('should handle undefined input without throwing', () => {
      expect(() => highlight(undefined)).not.toThrow();
      expect(() => unhighlight(undefined)).not.toThrow();
    });

    it('should handle empty array without throwing', () => {
      expect(() => highlight([])).not.toThrow();
      expect(() => unhighlight([])).not.toThrow();
    });

    it('should handle empty object without throwing', () => {
      expect(() => highlight({})).not.toThrow();
      expect(() => unhighlight({})).not.toThrow();
    });
  });
});