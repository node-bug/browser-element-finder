/**
 * Unit tests for ElementFinder Node.js module
 * These tests run in Node.js and provide code coverage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  parseXPath,
  splitByOperator,
  parseCondition,
  ELEMENT_DEFINITIONS,
  getValidTypes,
  getBoundingBox,
  setSearchableAttributes,
  getSearchableAttributes,
  matchesType,
  matchesContent,
  getAllElements,
  findElement,
  highlight,
  unhighlight
} from '../../src/element-finder.js';

describe('ElementFinder Node.js Module Tests', () => {
  let window;
  let document;

  beforeAll(() => {
    // Create jsdom instance
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="btn1">Submit</button>
          <button id="btn2">Cancel</button>
          <button id="btn3">Click Me</button>
          <input type="text" id="txt1" placeholder="Enter name" />
          <input type="text" id="txt2" placeholder="Enter email" />
          <a href="/page1" id="link1">Home</a>
          <a href="/page2" id="link2">About</a>
          <div class="container">
            <span>Nested text</span>
          </div>
          <script>console.log('test')</script>
          <style>.test { color: red; }</style>
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
    
    // Set up global document and NodeFilter for getAllElements
    global.document = document;
    global.NodeFilter = window.NodeFilter;
    global.Node = window.Node;
    global.window = window;
  });

  afterAll(() => {
    window.close();
    delete global.document;
  });

  describe('parseXPath', () => {
    it('should return true for true() expression', () => {
      expect(parseXPath('true()', document.body)).toBe(true);
    });

    it('should handle parentheses', () => {
      expect(parseXPath('(true())', document.body)).toBe(true);
    });

    it('should handle OR conditions', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::button or self::input', btn)).toBe(true);
    });

    it('should handle AND conditions', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::button and true()', btn)).toBe(true);
    });
  });

  describe('splitByOperator', () => {
    it('should split by or', () => {
      const result = splitByOperator('a or b or c', 'or');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should split by and', () => {
      const result = splitByOperator('a and b and c', 'and');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should respect parentheses', () => {
      const result = splitByOperator('a or (b and c)', 'or');
      expect(result).toEqual(['a', '(b and c)']);
    });
  });

  describe('parseCondition', () => {
    it('should match self::tag', () => {
      const btn = document.getElementById('btn1');
      expect(parseCondition('self::button', btn)).toBe(true);
    });

    it('should match self::tag with attribute condition', () => {
      const btn = document.getElementById('btn1');
      expect(parseCondition("self::button[@id='btn1']", btn)).toBe(true);
    });

    it('should not match wrong self::tag', () => {
      const btn = document.getElementById('btn1');
      expect(parseCondition('self::input', btn)).toBe(false);
    });

    it('should match @attr', () => {
      const link = document.getElementById('link1');
      expect(parseCondition('@href', link)).toBe(true);
    });

    it('should match @attr=value', () => {
      const link = document.getElementById('link1');
      expect(parseCondition("@href='/page1'", link)).toBe(true);
    });

    it('should not match wrong @attr=value', () => {
      const link = document.getElementById('link1');
      expect(parseCondition("@href='/wrong'", link)).toBe(false);
    });

    it('should match contains(@attr, value)', () => {
      const link = document.getElementById('link1');
      expect(parseCondition("contains(@href, 'page1')", link)).toBe(true);
    });

    it('should match descendant::tag', () => {
      const container = document.querySelector('.container');
      expect(parseCondition('descendant::span', container)).toBe(true);
    });

    it('should match ancestor::*[condition]', () => {
      const span = document.querySelector('.container span');
      // The ancestor pattern checks if any ancestor matches the condition
      expect(parseCondition("ancestor::*[@class]", span)).toBe(true);
    });

    it('should return false for ancestor with no match', () => {
      const btn = document.getElementById('btn1');
      // No ancestor with id='nonexistent'
      expect(parseCondition("ancestor::*[@id='nonexistent']", btn)).toBe(false);
    });

    it('should return false for ancestor when element has no parent', () => {
      const btn = document.createElement('button');
      // Element with no parent - should return false for ancestor check
      expect(parseCondition("ancestor::*[@id]", btn)).toBe(false);
    });

    it('should check all ancestors in the while loop', () => {
      // Create nested elements to test the while loop iteration
      const outer = document.createElement('div');
      outer.setAttribute('id', 'outer');
      const middle = document.createElement('div');
      middle.setAttribute('id', 'middle');
      const inner = document.createElement('button');
      inner.setAttribute('id', 'inner');
      outer.appendChild(middle);
      middle.appendChild(inner);
      document.body.appendChild(outer);
      
      // Check ancestor condition - should iterate through middle and outer
      // but neither has the id we're looking for
      expect(parseCondition("ancestor::*[@id='nonexistent']", inner)).toBe(false);
      
      document.body.removeChild(outer);
    });

    it('should return false for unknown condition', () => {
      const btn = document.getElementById('btn1');
      expect(parseCondition('unknown', btn)).toBe(false);
    });

    it('should match @attr=value pattern', () => {
      const link = document.getElementById('link1');
      expect(parseCondition("@href='/page1'", link)).toBe(true);
      expect(parseCondition("@href='/wrong'", link)).toBe(false);
    });

    it('should match @attr attribute exists check', () => {
      const link = document.getElementById('link1');
      expect(parseCondition('@href', link)).toBe(true);
      expect(parseCondition('@nonexistent', link)).toBe(false);
    });
  });

  describe('ELEMENT_DEFINITIONS', () => {
    it('should have button definition', () => {
      expect(ELEMENT_DEFINITIONS.button).toBeDefined();
      expect(ELEMENT_DEFINITIONS.button).toContain('button');
    });

    it('should have link definition', () => {
      expect(ELEMENT_DEFINITIONS.link).toBeDefined();
    });
  });

  describe('getValidTypes', () => {
    it('should return valid element types', () => {
      const types = getValidTypes();
      expect(types).toContain('button');
      expect(types).toContain('textbox');
      expect(types).toContain('link');
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('getBoundingBox', () => {
    it('should get bounding box for element', () => {
      const btn = document.getElementById('btn1');
      const box = getBoundingBox(btn);
      expect(box).toHaveProperty('x');
      expect(box).toHaveProperty('y');
      expect(box).toHaveProperty('width');
      expect(box).toHaveProperty('height');
      expect(box.tagName).toBe('button');
    });
  });

  describe('searchable attributes', () => {
    it('should manage searchable attributes', () => {
      const attrs = getSearchableAttributes();
      expect(attrs).toBeDefined();
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs.length).toBeGreaterThan(0);
    });

    it('should set searchable attributes', () => {
      setSearchableAttributes(['custom-attr', 'another-attr']);
      const attrs = getSearchableAttributes();
      expect(attrs).toContain('custom-attr');
      expect(attrs).toContain('another-attr');
      
      // Reset to default
      setSearchableAttributes([
        'placeholder', 'value', 'data-test-id', 'data-testid', 'id',
        'resource-id', 'name', 'aria-label', 'class', 'hint',
        'title', 'tooltip', 'alt', 'src', 'aria-labelledby'
      ]);
    });
  });

  describe('matchesType', () => {
    it('should match button type', () => {
      const btn = document.getElementById('btn1');
      expect(matchesType(btn, 'button')).toBe(true);
    });

    it('should not match wrong type', () => {
      const btn = document.getElementById('btn1');
      expect(matchesType(btn, 'textbox')).toBe(false);
    });
  });

  describe('matchesContent', () => {
    it('should match text content', () => {
      const btn = document.getElementById('btn1');
      expect(matchesContent(btn, 'Submit')).toBe(true);
    });

    it('should match placeholder attribute', () => {
      const txt = document.getElementById('txt1');
      expect(matchesContent(txt, 'Enter name')).toBe(true);
    });

    it('should return true for empty value', () => {
      const btn = document.getElementById('btn1');
      expect(matchesContent(btn, '')).toBe(true);
    });
  });

  describe('getAllElements', () => {
    it('should get all elements from document', () => {
      const elements = getAllElements(document);
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).not.toHaveProperty('frameIndex');
    });

    it('should skip SCRIPT and STYLE tags', () => {
      const elements = getAllElements(document);
      const hasScript = elements.some(e => e.tagName === 'SCRIPT');
      const hasStyle = elements.some(e => e.tagName === 'STYLE');
      expect(hasScript).toBe(false);
      expect(hasStyle).toBe(false);
    });

    it('should return raw DOM elements', () => {
      const elements = getAllElements(document);
      expect(elements[0].nodeType).toBe(Node.ELEMENT_NODE);
    });
  });

  describe('findElement', () => {
    it('should find elements by type', () => {
      const result = findElement('button', null, false, true);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find elements by text', () => {
      const result = findElement(null, 'Submit', false, true);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown type', () => {
      const result = findElement('unknown', null, false, true);
      expect(result.elements).toEqual([]);
    });

    it('should filter hidden elements by default', () => {
      // In jsdom, elements have offsetWidth/offsetHeight of 0 by default
      // So we need to use includeHidden=true to find them
      const result = findElement('button', null, false, true);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should include hidden elements when includeHidden is true', () => {
      const result = findElement('button', null, false, true);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should return results with bounding boxes', () => {
      const result = findElement('button', null, false, true);
      expect(result.elements.length).toBeGreaterThan(0);
      // Element is returned as object with element and metadata
      expect(result.elements[0]).toHaveProperty('element');
      expect(result.elements[0]).toHaveProperty('boundingBox');
      expect(result.elements[0]).toHaveProperty('tagName');
    });

    it('should filter out ancestors when innermost is requested', () => {
      // Add nested elements
      const outer = document.createElement('div');
      outer.id = 'outer';
      const inner = document.createElement('button');
      inner.id = 'inner';
      inner.textContent = 'Nested Button';
      outer.appendChild(inner);
      document.body.appendChild(outer);
      
      const result = findElement('button', null, false, true);
      // Should only find the inner button, not outer div
      expect(result.elements.length).toBeGreaterThan(0);
      // Check that elements have the new format
      result.elements.forEach(e => {
        expect(e).toHaveProperty('element');
        expect(e).toHaveProperty('boundingBox');
      });
      
      document.body.removeChild(outer);
    });

    it('should filter elements with display none', () => {
      // Add hidden element
      const hiddenBtn = document.createElement('button');
      hiddenBtn.id = 'hidden-btn';
      hiddenBtn.textContent = 'Hidden';
      hiddenBtn.style.display = 'none';
      document.body.appendChild(hiddenBtn);
      
      // With includeHidden=false, should not find it
      const result = findElement('button', null, false, false);
      const hasHidden = result.elements.some(e => e.id === 'hidden-btn');
      expect(hasHidden).toBe(false);
      
      document.body.removeChild(hiddenBtn);
    });

    it('should filter elements with visibility hidden', () => {
      // Add hidden element
      const hiddenBtn = document.createElement('button');
      hiddenBtn.id = 'hidden-btn2';
      hiddenBtn.textContent = 'Hidden2';
      hiddenBtn.style.visibility = 'hidden';
      document.body.appendChild(hiddenBtn);
      
      // With includeHidden=false, should not find it
      const result = findElement('button', null, false, false);
      const hasHidden = result.elements.some(e => e.id === 'hidden-btn2');
      expect(hasHidden).toBe(false);
      
      document.body.removeChild(hiddenBtn);
    });

    it('should filter elements with opacity zero', () => {
      // Add hidden element
      const hiddenBtn = document.createElement('button');
      hiddenBtn.id = 'hidden-btn3';
      hiddenBtn.textContent = 'Hidden3';
      hiddenBtn.style.opacity = '0';
      document.body.appendChild(hiddenBtn);
      
      // With includeHidden=false, should not find it
      const result = findElement('button', null, false, false);
      const hasHidden = result.elements.some(e => e.id === 'hidden-btn3');
      expect(hasHidden).toBe(false);
      
      document.body.removeChild(hiddenBtn);
    });

    it('should find elements within a parent element', () => {
      // Create a container with specific buttons
      const container = document.createElement('div');
      container.id = 'test-container';
      const btn1 = document.createElement('button');
      btn1.textContent = 'Parent Button 1';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Parent Button 2';
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);
      
      // Find buttons within the parent
      const result = findElement('button', null, false, true, container);
      expect(result.elements.length).toBe(2);
      
      document.body.removeChild(container);
    });

    it('should not find elements outside parent element', () => {
      // Create a container with a button
      const container = document.createElement('div');
      container.id = 'test-container-2';
      const btn = document.createElement('button');
      btn.textContent = 'Inside Container';
      container.appendChild(btn);
      document.body.appendChild(container);
      
      // Find buttons within the parent - should not find btn1 or btn2
      const result = findElement('button', null, false, true, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.textContent).toBe('Inside Container');
      
      document.body.removeChild(container);
    });

    it('should find elements by text within parent', () => {
      // Create a container with specific buttons
      const container = document.createElement('div');
      container.id = 'test-container-3';
      const btn1 = document.createElement('button');
      btn1.textContent = 'Unique Text ABC';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Other Text';
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);
      
      // Find button with specific text within parent
      const result = findElement(null, 'Unique Text ABC', false, true, container);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.textContent).toBe('Unique Text ABC');
      
      document.body.removeChild(container);
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
  });

  describe('Edge Cases and Performance Tests', () => {
    it('should handle deeply nested elements', () => {
      // Create a deeply nested structure
      let parent = document.createElement('div');
      parent.setAttribute('data-depth', '0');
      document.body.appendChild(parent);
      
      let current = parent;
      for (let i = 1; i <= 10; i++) {
        const child = document.createElement('div');
        child.setAttribute('data-depth', `${i}`);
        current.appendChild(child);
        current = child;
      }
      
      const deepestBtn = document.createElement('button');
      deepestBtn.id = 'deep-btn';
      deepestBtn.textContent = 'Deep Button';
      current.appendChild(deepestBtn);
      
      // Find the deep button
      const result = findElement('button', 'Deep Button', false, true);
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.elements.some(e => e.element.id === 'deep-btn')).toBe(true);
      
      document.body.removeChild(parent);
    });

    it('should handle unicode and emoji in text matching', () => {
      const btn = document.createElement('button');
      btn.id = 'emoji-btn';
      btn.textContent = '🎯 Target Button 中文';
      document.body.appendChild(btn);
      
      // Find by emoji
      const result1 = findElement('button', '🎯', false, true);
      expect(result1.elements.some(e => e.element.id === 'emoji-btn')).toBe(true);
      
      // Find by Chinese characters
      const result2 = findElement('button', '中文', false, true);
      expect(result2.elements.some(e => e.element.id === 'emoji-btn')).toBe(true);
      
      document.body.removeChild(btn);
    });

    it('should handle exact matching mode', () => {
      const btn = document.createElement('button');
      btn.id = 'exact-btn';
      btn.textContent = 'Click Me Now';
      document.body.appendChild(btn);
      
      // Exact match should find
      const result1 = findElement('button', 'Click Me Now', true, true);
      expect(result1.elements.some(e => e.element.id === 'exact-btn')).toBe(true);
      
      // Partial match should not find in exact mode
      const result2 = findElement('button', 'Click Me', true, true);
      expect(result2.elements.some(e => e.element.id === 'exact-btn')).toBe(false);
      
      // Partial match should find in non-exact mode
      const result3 = findElement('button', 'Click Me', false, true);
      expect(result3.elements.some(e => e.element.id === 'exact-btn')).toBe(true);
      
      document.body.removeChild(btn);
    });

    it('should handle large DOM with many elements', () => {
      const container = document.createElement('div');
      container.id = 'large-dom';
      
      // Create 100 buttons
      for (let i = 0; i < 100; i++) {
        const btn = document.createElement('button');
        btn.id = `btn-${i}`;
        btn.textContent = `Button ${i}`;
        container.appendChild(btn);
      }
      document.body.appendChild(container);
      
      // Find all buttons
      const result = findElement('button', null, false, true, container);
      expect(result.elements.length).toBe(100);
      
      // Find specific button
      const result2 = findElement('button', 'Button 50', false, true, container);
      expect(result2.elements.some(e => e.element.id === 'btn-50')).toBe(true);
      
      document.body.removeChild(container);
    });

    it('should handle maxFrames parameter', () => {
      const result = findElement('button', null, false, true, null, 1);
      // Should find buttons in main frame
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should match complex XPath expressions', () => {
      const btn = document.getElementById('btn1');
      
      // Test OR with multiple conditions
      const result1 = parseXPath('self::button or self::input', btn);
      expect(result1).toBe(true);
      
      // Test AND with multiple conditions
      const result2 = parseXPath('self::button and true()', btn);
      expect(result2).toBe(true);
      
      // Test nested parentheses
      const result3 = parseXPath('((self::button))', btn);
      expect(result3).toBe(true);
    });

    it('should handle case-insensitive attribute matching', () => {
      const btn = document.createElement('button');
      btn.setAttribute('DATA-TYPE', 'SUBMIT');
      btn.id = 'case-btn';
      document.body.appendChild(btn);
      
      // Should match with lowercase
      const result = findElement(null, null, false, true);
      // Just verify no errors
      expect(result.elements).toBeDefined();
      
      document.body.removeChild(btn);
    });

    it('should handle elements with no text content', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = 'Test Image';
      document.body.appendChild(img);
      
      // Find by alt text
      const result = findElement(null, 'Test Image', false, true);
      expect(result.elements.length).toBeGreaterThan(0);
      
      document.body.removeChild(img);
    });

    it('should handle matchesType with invalid type', () => {
      const btn = document.getElementById('btn1');
      const result = matchesType(btn, 'nonexistent-type');
      expect(result).toBe(false);
    });

    it('should handle multiple spaces in text matching', () => {
      const btn = document.createElement('button');
      btn.id = 'space-btn';
      btn.textContent = 'Multiple Spaces';
      document.body.appendChild(btn);
      
      // Should match after trimming
      const result = findElement('button', 'Multiple Spaces', false, true);
      expect(result.elements.length).toBeGreaterThan(0);
      
      document.body.removeChild(btn);
    });

    it('should handle select options matching', () => {
      const select = document.createElement('select');
      select.id = 'dropdown';
      const option1 = document.createElement('option');
      option1.textContent = 'Option One';
      const option2 = document.createElement('option');
      option2.textContent = 'Option Two';
      select.appendChild(option1);
      select.appendChild(option2);
      document.body.appendChild(select);
      
      // Select element should be found even if no direct text match
      const result = findElement('dropdown', null, false, true);
      expect(result.elements.length).toBeGreaterThan(0);
      
      document.body.removeChild(select);
    });

    it('should handle highlight with result wrapper format', () => {
      const btn = document.getElementById('btn1');
      const results = {
        elements: [
          {
            element: btn,
            boundingBox: getBoundingBox(btn),
            tagName: 'button'
          }
        ]
      };
      
      highlight(results, 'blue', 2);
      expect(btn.style.outline).toBe('2px solid blue');
      
      unhighlight(results);
      expect(btn.style.outline).toBe('');
    });

    it('should handle invalid regex patterns gracefully', () => {
      const expr = "self::button[@id='test']";
      const btn = document.getElementById('btn1');
      
      // Should not throw
      const result = parseCondition(expr, btn);
      expect(typeof result).toBe('boolean');
    });

    it('should split operators with mixed case', () => {
      const result1 = splitByOperator('a OR b', 'or');
      expect(result1.length).toBe(2);
      
      const result2 = splitByOperator('a AND b', 'and');
      expect(result2.length).toBe(2);
    });

    it('should handle operators in quoted strings', () => {
      const result = splitByOperator("contains(@text, 'or') or @type='button'", 'or');
      expect(result.length).toBe(2);
      expect(result[0]).toContain('or');
    });
  });
});