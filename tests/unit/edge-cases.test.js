/**
 * Unit tests for ElementFinder edge cases
 * Covers boundary conditions, input validation, and DOM structure anomalies
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  setSearchableAttributes,
  findElements,
  findElementByAttributes,
  parseXPath
} from '../../src/element-finder.js';

describe('ElementFinder Edge Cases', () => {
  let window;
  let document;

  beforeAll(() => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="root">
            <div id="level1">
              <div id="level2">
                <div id="level3">
                  <div id="level4">
                    <div id="level5">
                      <div id="level6">
                        <div id="level7">
                          <div id="level8">
                            <div id="level9">
                              <button id="deep-btn">Deep Button</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div id="level que">
                        <button id="special-char-btn" data-test-id="special-char-id">Spezial ✨ Text</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="script-test">
              <script>
                const secret = "don't find me";
                console.log(secret);
              </script>
              <style>
                .hidden-text { content: "don't find me either"; }
              </style>
              <button id="valid-btn">Valid Button</button>
            </div>
            <div id="priority-test">
              <button id="prio-btn" placeholder="priority-placeholder" data-test-id="priority-id">Priority Test</button>
            </div>
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
      const result = findElementByAttributes("don't find me");
      expect(result.elements.length).toBe(0);
    });

    it('should NOT find text inside style tags', () => {
      const result = findElementByAttributes("don't find me either");
      expect(result.elements.length).toBe(0);
    });

    it('should respect attribute priority (data-test-id > id > placeholder)', () => {
      // The element has: id="prio-btn", placeholder="priority-placeholder", data-test-id="priority-id"
      // We search for "priority-id" which is the highest priority attribute
      const result = findElementByAttributes('priority-id');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.id).toBe('prio-btn');
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
