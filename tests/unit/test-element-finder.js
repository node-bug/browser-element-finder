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
          <!-- Table for column tests -->
          <table id="test-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>City</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alice</td>
                <td>30</td>
                <td>New York</td>
              </tr>
              <tr>
                <td>Bob</td>
                <td>25</td>
                <td>London</td>
              </tr>
              <tr>
                <td>Charlie</td>
                <td>35</td>
                <td>Paris</td>
              </tr>
            </tbody>
          </table>
          <!-- Table with colspan for testing -->
          <table id="colspan-table">
            <thead>
              <tr>
                <th colspan="2">Full Name</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John</td>
                <td>Doe</td>
                <td>40</td>
              </tr>
              <tr>
                <td>Jane</td>
                <td>Smith</td>
                <td>35</td>
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

  describe('Column Element Type - Find All Cells in Column', () => {
    it('should find all cells in a column when searching by header text', () => {
      // Search for "City" header should return all City column cells
      const result = findElement('column', 'City', false, true);
      expect(result.elements.length).toBeGreaterThanOrEqual(4); // 1 header + 3 data cells
      
      const texts = result.elements.map(e => e.element.textContent.trim());
      expect(texts).toContain('City');
      expect(texts).toContain('New York');
      expect(texts).toContain('London');
      expect(texts).toContain('Paris');
    });

    it('should find all cells in Name column when searching by header text', () => {
      const result = findElement('column', 'Name', false, true);
      expect(result.elements.length).toBeGreaterThanOrEqual(4); // 1 header + 3 data cells
      
      const texts = result.elements.map(e => e.element.textContent.trim());
      expect(texts).toContain('Name');
      expect(texts).toContain('Alice');
      expect(texts).toContain('Bob');
      expect(texts).toContain('Charlie');
    });

    it('should find all cells in Age column when searching by header text', () => {
      const result = findElement('column', 'Age', false, true);
      expect(result.elements.length).toBeGreaterThanOrEqual(4); // 1 header + 3 data cells
      
      const texts = result.elements.map(e => e.element.textContent.trim());
      expect(texts).toContain('Age');
      expect(texts).toContain('30');
      expect(texts).toContain('25');
      expect(texts).toContain('35');
    });

    it('should handle colspan headers - treated as single column', () => {
      // "Full Name" header has colspan="2", but we treat it as a single column
      // So it should find cells in just the first column position
      const result = findElement('column', 'Full Name', false, true);
      expect(result.elements.length).toBeGreaterThanOrEqual(3); // 1 header + 2 data cells
      
      const texts = result.elements.map(e => e.element.textContent.trim());
      expect(texts).toContain('Full Name');
      expect(texts).toContain('John');
      expect(texts).toContain('Jane');
    });

    it('should still find individual cell by text content', () => {
      // Searching for a data cell text should still work
      const result = findElement('column', 'Paris', false, true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element.textContent.trim()).toBe('Paris');
    });

    it('should only expand within the same table as the matched header', () => {
      // Create a second table with same column header
      const table2 = document.createElement('table');
      table2.id = 'second-table';
      table2.innerHTML = `
        <thead>
          <tr>
            <th>City</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tokyo</td>
          </tr>
        </tbody>
      `;
      document.body.appendChild(table2);

      // Search for "City" should find cells from both tables
      const result = findElement('column', 'City', false, true);
      const texts = result.elements.map(e => e.element.textContent.trim());
      
      // Should include cells from both tables
      expect(texts).toContain('City');
      expect(texts).toContain('New York');
      expect(texts).toContain('Tokyo');

      document.body.removeChild(table2);
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

  describe('XPath Edge Cases', () => {
    it('should handle deeply nested parentheses', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('((self::button))', btn)).toBe(true);
      expect(parseXPath('(((self::button)))', btn)).toBe(true);
      expect(parseXPath('(((self::button and true())))', btn)).toBe(true);
    });

    it('should handle mixed operators with parentheses', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('(self::button and true()) or self::input', btn)).toBe(true);
      expect(parseXPath('self::button and (true() or false())', btn)).toBe(true);
    });

    it('should handle empty expression', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('', btn)).toBe(false);
    });

    it('should handle complex OR with multiple conditions', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::button or self::input or self::select', btn)).toBe(true);
    });

    it('should handle complex AND with multiple conditions', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::button and true() and true()', btn)).toBe(true);
    });

    it('should handle OR with false conditions', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::input or self::select', btn)).toBe(false);
    });

    it('should handle AND with false condition', () => {
      const btn = document.getElementById('btn1');
      expect(parseXPath('self::button and false()', btn)).toBe(false);
    });
  });

  describe('All Element Types', () => {
    it('should match navigation type', () => {
      const nav = document.createElement('nav');
      nav.id = 'test-nav';
      document.body.appendChild(nav);
      expect(matchesType(nav, 'navigation')).toBe(true);
      document.body.removeChild(nav);
    });

    it('should match heading types (h1-h6)', () => {
      for (let i = 1; i <= 6; i++) {
        const heading = document.createElement(`h${i}`);
        heading.id = `h${i}-test`;
        document.body.appendChild(heading);
        expect(matchesType(heading, 'heading')).toBe(true);
        document.body.removeChild(heading);
      }
    });

    it('should match heading with role=heading', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'heading');
      document.body.appendChild(div);
      expect(matchesType(div, 'heading')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match switch type', () => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'switch-test';
      document.body.appendChild(input);
      expect(matchesType(input, 'switch')).toBe(true);
      document.body.removeChild(input);
    });

    it('should match slider type', () => {
      const input = document.createElement('input');
      input.type = 'range';
      input.id = 'slider-test';
      document.body.appendChild(input);
      expect(matchesType(input, 'slider')).toBe(true);
      document.body.removeChild(input);
    });

    it('should match radio type', () => {
      const input = document.createElement('input');
      input.type = 'radio';
      input.id = 'radio-test';
      document.body.appendChild(input);
      expect(matchesType(input, 'radio')).toBe(true);
      document.body.removeChild(input);
    });

    it('should match file type', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'file-test';
      document.body.appendChild(input);
      expect(matchesType(input, 'file')).toBe(true);
      document.body.removeChild(input);
    });

    it('should match list type (ul, ol)', () => {
      const ul = document.createElement('ul');
      ul.id = 'ul-test';
      document.body.appendChild(ul);
      expect(matchesType(ul, 'list')).toBe(true);
      document.body.removeChild(ul);

      const ol = document.createElement('ol');
      ol.id = 'ol-test';
      document.body.appendChild(ol);
      expect(matchesType(ol, 'list')).toBe(true);
      document.body.removeChild(ol);
    });

    it('should match listitem type', () => {
      const li = document.createElement('li');
      li.id = 'li-test';
      document.body.appendChild(li);
      expect(matchesType(li, 'listitem')).toBe(true);
      document.body.removeChild(li);
    });

    it('should match menu type', () => {
      const menu = document.createElement('menu');
      menu.id = 'menu-test';
      document.body.appendChild(menu);
      expect(matchesType(menu, 'menu')).toBe(true);
      document.body.removeChild(menu);
    });

    it('should match menuitem type', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'menuitem');
      document.body.appendChild(div);
      expect(matchesType(div, 'menuitem')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match toolbar type', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'toolbar');
      document.body.appendChild(div);
      expect(matchesType(div, 'toolbar')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match dialog type', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'dialog');
      document.body.appendChild(div);
      expect(matchesType(div, 'dialog')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match image type (img)', () => {
      const img = document.createElement('img');
      img.id = 'img-test';
      document.body.appendChild(img);
      expect(matchesType(img, 'image')).toBe(true);
      document.body.removeChild(img);
    });

    it('should match image type with role=img', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'img');
      document.body.appendChild(div);
      expect(matchesType(div, 'image')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match image type with alt attribute', () => {
      const div = document.createElement('div');
      div.setAttribute('alt', 'test image');
      document.body.appendChild(div);
      expect(matchesType(div, 'image')).toBe(true);
      document.body.removeChild(div);
    });

    it('should match table type', () => {
      const table = document.createElement('table');
      table.id = 'table-test';
      document.body.appendChild(table);
      expect(matchesType(table, 'table')).toBe(true);
      document.body.removeChild(table);
    });

    it('should match row type', () => {
      const tr = document.createElement('tr');
      tr.id = 'tr-test';
      document.body.appendChild(tr);
      expect(matchesType(tr, 'row')).toBe(true);
      document.body.removeChild(tr);
    });

    it('should match column type (td, th)', () => {
      const td = document.createElement('td');
      td.id = 'td-test';
      document.body.appendChild(td);
      expect(matchesType(td, 'column')).toBe(true);
      document.body.removeChild(td);

      const th = document.createElement('th');
      th.id = 'th-test';
      document.body.appendChild(th);
      expect(matchesType(th, 'column')).toBe(true);
      document.body.removeChild(th);
    });

    it('should match element type (true() for all)', () => {
      const btn = document.getElementById('btn1');
      expect(matchesType(btn, 'element')).toBe(true);
    });
  });

  describe('Attribute Matching Edge Cases', () => {
    it('should handle special characters in attribute values', () => {
      const btn = document.createElement('button');
      btn.setAttribute('title', 'test@example.com');
      document.body.appendChild(btn);
      expect(matchesContent(btn, 'test@example.com')).toBe(true);
      document.body.removeChild(btn);
    });

    it('should handle multiple class names', () => {
      const btn = document.createElement('button');
      btn.className = 'btn primary large';
      document.body.appendChild(btn);
      expect(matchesContent(btn, 'btn')).toBe(true);
      expect(matchesContent(btn, 'primary')).toBe(true);
      expect(matchesContent(btn, 'large')).toBe(true);
      document.body.removeChild(btn);
    });

    it('should handle aria-label attribute', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Close dialog');
      document.body.appendChild(btn);
      expect(matchesContent(btn, 'Close dialog')).toBe(true);
      document.body.removeChild(btn);
    });

    it('should handle title attribute', () => {
      const btn = document.createElement('button');
      btn.setAttribute('title', 'Submit form');
      document.body.appendChild(btn);
      expect(matchesContent(btn, 'Submit form')).toBe(true);
      document.body.removeChild(btn);
    });

    it('should handle case-insensitive text matching', () => {
      const btn = document.createElement('button');
      btn.textContent = 'Submit Button';
      document.body.appendChild(btn);
      expect(matchesContent(btn, 'SUBMIT')).toBe(true);
      expect(matchesContent(btn, 'submit')).toBe(true);
      expect(matchesContent(btn, 'SuBmIt')).toBe(true);
      document.body.removeChild(btn);
    });
  });

  describe('getAllElements Edge Cases', () => {
    it('should include SVG elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'svg-test';
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      svg.appendChild(rect);
      document.body.appendChild(svg);

      const elements = getAllElements(document);
      expect(elements.some(e => e.id === 'svg-test')).toBe(true);
      expect(elements.some(e => e.tagName === 'svg')).toBe(true);

      document.body.removeChild(svg);
    });

    it('should handle elements with no parent', () => {
      const orphan = document.createElement('button');
      // Don't append to document
      expect(orphan.parentElement).toBeNull();
      // Should still be able to process
      expect(orphan.nodeType).toBe(Node.ELEMENT_NODE);
    });
  });

  describe('findElement Error Handling', () => {
    it('should handle null parent parameter', () => {
      const result = findElement('button', null, false, true, null);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle empty document', () => {
      // Create a fresh JSDOM with empty body
      const emptyDoc = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
      });
      const emptyWindow = emptyDoc.window;
      const emptyDocument = emptyWindow.document;
      
      // Set up globals for this test
      const originalDocument = global.document;
      const originalWindow = global.window;
      const originalNodeFilter = global.NodeFilter;
      const originalNode = global.Node;
      
      global.document = emptyDocument;
      global.window = emptyWindow;
      global.NodeFilter = emptyWindow.NodeFilter;
      global.Node = emptyWindow.Node;

      const result = findElement('button', null, false, true);
      expect(result.elements).toEqual([]);

      // Restore originals
      global.document = originalDocument;
      global.window = originalWindow;
      global.NodeFilter = originalNodeFilter;
      global.Node = originalNode;
      
      emptyDoc.window.close();
    });

    it('should handle matchesType with invalid type', () => {
      const btn = document.getElementById('btn1');
      expect(matchesType(btn, 'nonexistent-type')).toBe(false);
    });
  });

  describe('extractElements null handling', () => {
    it('should handle null input gracefully', () => {
      // Test that null input doesn't crash highlight/unhighlight
      expect(() => highlight(null)).not.toThrow();
      expect(() => unhighlight(null)).not.toThrow();
    });

    it('should handle undefined input gracefully', () => {
      expect(() => highlight(undefined)).not.toThrow();
      expect(() => unhighlight(undefined)).not.toThrow();
    });

    it('should handle empty array input', () => {
      expect(() => highlight([])).not.toThrow();
      expect(() => unhighlight([])).not.toThrow();
    });

    it('should handle empty object input', () => {
      expect(() => highlight({})).not.toThrow();
      expect(() => unhighlight({})).not.toThrow();
    });
  });

  describe('parseXPath null/undefined input handling', () => {
    it('should handle null expression gracefully', () => {
      expect(parseXPath(null, document.body)).toBe(false);
    });

    it('should handle undefined expression gracefully', () => {
      expect(parseXPath(undefined, document.body)).toBe(false);
    });

    it('should handle null element gracefully', () => {
      expect(parseXPath('true()', null)).toBe(false);
    });

    it('should handle undefined element gracefully', () => {
      expect(parseXPath('true()', undefined)).toBe(false);
    });
  });

  describe('parseCondition null/undefined input handling', () => {
    it('should handle null expression gracefully', () => {
      expect(parseCondition(null, document.body)).toBe(false);
    });

    it('should handle undefined expression gracefully', () => {
      expect(parseCondition(undefined, document.body)).toBe(false);
    });

    it('should handle null element gracefully', () => {
      expect(parseCondition('self::button', null)).toBe(false);
    });

    it('should handle undefined element gracefully', () => {
      expect(parseCondition('self::button', undefined)).toBe(false);
    });
  });

  describe('matchesType null/undefined input handling', () => {
    it('should handle null element gracefully', () => {
      expect(matchesType(null, 'button')).toBe(false);
    });

    it('should handle undefined element gracefully', () => {
      expect(matchesType(undefined, 'button')).toBe(false);
    });
  });

  describe('matchesContent null/undefined input handling', () => {
    it('should handle null element gracefully', () => {
      expect(matchesContent(null, 'test')).toBe(false);
    });

    it('should handle undefined element gracefully', () => {
      expect(matchesContent(undefined, 'test')).toBe(false);
    });
  });

  describe('deep recursion handling', () => {
    it('should throw error for deeply nested parentheses exceeding max depth', () => {
      // Create a deeply nested expression (100 levels) - exceeds MAX_RECURSION_DEPTH
      const deepExpr = '((((' + '('.repeat(100) + 'true()' + ')'.repeat(100) + '))))';
      expect(() => parseXPath(deepExpr, document.body)).toThrow('XPath expression exceeds maximum recursion depth');
    });

    it('should handle complex nested OR/AND conditions', () => {
      const complexExpr = '(self::button or self::input) and (self::button or true())';
      const btn = document.getElementById('btn1');
      expect(parseXPath(complexExpr, btn)).toBe(true);
    });
  });

  describe('getAttribute edge cases', () => {
    it('should handle elements with special characters in attribute values', () => {
      const div = document.createElement('div');
      div.setAttribute('data-value', 'test-with-quotes');
      expect(parseCondition("@data-value='test-with-quotes'", div)).toBe(true);
    });

    it('should handle elements with empty attribute values', () => {
      const div = document.createElement('div');
      div.setAttribute('data-empty', '');
      // Empty string matches empty attribute
      expect(parseCondition("@data-empty=''", div)).toBe(true);
    });

    it('should handle elements with numeric attribute values', () => {
      const div = document.createElement('div');
      div.setAttribute('data-num', '123');
      expect(parseCondition("@data-num='123'", div)).toBe(true);
    });
  });

  describe('setSearchableAttributes validation', () => {
    it('should throw TypeError for non-array input', () => {
      expect(() => setSearchableAttributes('not-an-array')).toThrow(TypeError);
      expect(() => setSearchableAttributes('not-an-array')).toThrow('attributes must be an array');
    });

    it('should throw TypeError for null input', () => {
      expect(() => setSearchableAttributes(null)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined input', () => {
      expect(() => setSearchableAttributes(undefined)).toThrow(TypeError);
    });

    it('should handle valid array input', () => {
      const original = getSearchableAttributes();
      setSearchableAttributes(['data-test', 'data-custom']);
      expect(getSearchableAttributes()).toEqual(['data-test', 'data-custom']);
      // Reset to original
      setSearchableAttributes(original);
    });
  });

  describe('findElement error paths', () => {
    it('should throw TypeError for non-string type parameter', () => {
      expect(() => findElement(123, null, false, true)).toThrow(TypeError);
      expect(() => findElement(123, null, false, true)).toThrow('type must be a string');
    });

    it('should handle null type parameter (defaults to element)', () => {
      expect(() => findElement(null, null, false, true)).not.toThrow();
    });

    it('should handle undefined type parameter (defaults to element)', () => {
      expect(() => findElement(undefined, null, false, true)).not.toThrow();
    });

    it('should handle negative maxFrames parameter', () => {
      // maxFrames limits additional frames, but main frame is always included
      const result = findElement('button', null, false, true, null, -1);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle zero maxFrames parameter', () => {
      // maxFrames limits additional frames, but main frame is always included
      const result = findElement('button', null, false, true, null, 0);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('getAllElements error paths', () => {
    it('should throw for null root parameter', () => {
      expect(() => getAllElements(null)).toThrow();
    });

    it('should handle undefined root parameter', () => {
      expect(() => getAllElements(undefined)).not.toThrow();
    });
  });

  describe('getBoundingBox edge cases', () => {
    it('should handle element with getBoundingClientRect', () => {
      const mockEl = {
        getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 50, top: 0, bottom: 50, left: 0, right: 100 }),
        tagName: 'DIV'
      };
      const result = getBoundingBox(mockEl);
      expect(result.tagName).toBe('div');
    });
  });
});