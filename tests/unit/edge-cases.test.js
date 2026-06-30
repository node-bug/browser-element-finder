/**
 * Unit tests for ElementFinder edge cases
 * Covers boundary conditions, input validation, and DOM structure anomalies
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  setSearchableAttributes,
  findElements,
  findElementsByAttribute,
  parseXPath
} from '../../src/element-finder.js';

describe('ElementFinder Edge Cases', () => {
  let window;
  let document;

  beforeAll(() => {
    const fixturePath = resolve(__dirname, 'fixtures/edge-cases.html');
    const html = readFileSync(fixturePath, 'utf-8');

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
    setSearchableAttributes([
      "data-test-id",
      "id",
      "placeholder"
    ]);
  });

  describe('Input Validation', () => {
    it('should handle null or undefined text in findElements', () => {
      expect(findElements('button', null).elements.length).toBeGreaterThan(0);
      expect(findElements('button', undefined).elements.length).toBeGreaterThan(0);
    });

    it('should handle empty string text in findElements', () => {
      expect(findElements('button', '').elements.length).toBeGreaterThan(0);
    });

    it('should throw TypeError when setSearchableAttributes is called with non-array', () => {
      expect(() => setSearchableAttributes('not-an-array')).toThrow(TypeError);
      expect(() => setSearchableAttributes(null)).toThrow(TypeError);
      expect(() => setSearchableAttributes({})).toThrow(TypeError);
    });
  });

  describe('DOM Structure & Content Edge Cases', () => {
    it('should find deeply nested elements', () => {
      const result = findElements('button', 'Deep Button');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.id).toBe('deep-btn');
    });

    it('should find elements with various leading and trailing whitespace (tabs, newlines, carriage returns)', () => {
      const div = document.createElement('div');
      div.id = 'whitespace-test';
      div.textContent = '\n\t  Whitespace Test\r\n ';
      document.body.appendChild(div);

      const result = findElements('element', 'Whitespace Test');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.id).toBe('whitespace-test');
      
      document.body.removeChild(div);
    });

    it('should NOT find text inside script tags', () => {
      const result = findElementsByAttribute("don't find me");
      expect(result.elements.length).toBe(0);
    });

    it('should NOT find text inside style tags', () => {
      const result = findElementsByAttribute("don't find me either");
      expect(result.elements.length).toBe(0);
    });

    it('should respect attribute priority (data-test-id > id > placeholder)', () => {
      // The element has: id="prio-btn", placeholder="priority-placeholder", data-test-id="priority-id"
      // We search for "priority-id" which is the highest priority attribute
      const result = findElementsByAttribute('priority-id');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.id).toBe('prio-btn');
    });
  });

  describe('isHidden flag', () => {
    it('should include isHidden flag in returned elements', () => {
      const result = findElements('button', null);
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.elements[0].isHidden).toBeDefined();
      expect(typeof result.elements[0].isHidden).toBe('boolean');
    });

    it('should detect hidden elements with hidden attribute', () => {
      const hiddenDiv = document.createElement('div');
      hiddenDiv.id = 'hidden-attr-test';
      hiddenDiv.setAttribute('data-test-id', 'hidden-attr-id');
      hiddenDiv.setAttribute('hidden', '');
      document.body.appendChild(hiddenDiv);

      const result = findElementsByAttribute('hidden-attr-id');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].isHidden).toBe(true);

      document.body.removeChild(hiddenDiv);
    });

    it('should detect elements with zero width and height as hidden', () => {
      const zeroSizeDiv = document.createElement('div');
      zeroSizeDiv.id = 'zero-size-test';
      zeroSizeDiv.setAttribute('data-test-id', 'zero-size-id');
      zeroSizeDiv.style.width = '0px';
      zeroSizeDiv.style.height = '0px';
      document.body.appendChild(zeroSizeDiv);

      const result = findElementsByAttribute('zero-size-id');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].isHidden).toBe(true);

      document.body.removeChild(zeroSizeDiv);
    });

    it('should detect descendants of zero-size ancestors as hidden', () => {
      const zeroSizeParent = document.createElement('div');
      zeroSizeParent.id = 'zero-size-parent-test';
      zeroSizeParent.style.width = '0px';
      zeroSizeParent.style.height = '0px';

      const child = document.createElement('button');
      child.id = 'zero-size-child-test';
      child.setAttribute('data-test-id', 'zero-size-child-id');
      child.textContent = 'Zero Size Child';
      zeroSizeParent.appendChild(child);
      document.body.appendChild(zeroSizeParent);

      const result = findElementsByAttribute('zero-size-child-id');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].isHidden).toBe(true);

      document.body.removeChild(zeroSizeParent);
    });
  });

  describe('XPath Recursion Limit', () => {
    it('should throw error when maximum recursion depth is exceeded', () => {
      // Create a deeply nested expression: (((...)))
      const depth = 101;
      const nestedExpr = '('.repeat(depth) + 'true()' + ')'.repeat(depth);
      expect(() => parseXPath(nestedExpr, document.body)).toThrow('XPath expression exceeds maximum recursion depth');
    });
  });
});
