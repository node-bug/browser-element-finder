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
  getElementCounts,
  isHidden,
  matchesType,
  getAllElements,
  findElementsByType,
  findElements,
  highlight,
  unhighlight
} from '../../src/element-finder.js';

describe('ElementFinderByType Node.js Module Tests', () => {
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
          <input type="checkbox" id="chk1" />
          <input type="radio" id="radio1" name="group1" />
          <input type="range" id="slider1" min="0" max="100" />
          <input type="date" id="datepicker1" />
          <input type="color" id="colorpicker1" value="#ff0000" />
          <a href="/page1" id="link1">Home</a>
          <a href="/page2" id="link2">About</a>
          <select id="dropdown1">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
          <textarea id="textarea1">Some text</textarea>
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
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const dom = new JSDOM(html, { 
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    
    Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 10;
      }
    });
    Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 10;
      }
    });
    
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

  describe('parseXPath', () => {
    it('should return true for true() expression', () => {
      const el = document.createElement('div');
      expect(parseXPath('true()', el)).toBe(true);
    });

    it('should return false for null expression', () => {
      const el = document.createElement('div');
      expect(parseXPath(null, el)).toBe(false);
    });

    it('should return false for null element', () => {
      expect(parseXPath('true()', null)).toBe(false);
    });

    it('should match self::tag expressions', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      
      expect(parseXPath('self::div', div)).toBe(true);
      expect(parseXPath('self::div', span)).toBe(false);
      expect(parseXPath('self::span', span)).toBe(true);
    });

    it('should match @attr expressions', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'text');
      
      expect(parseXPath('@type', input)).toBe(true);
      expect(parseXPath('@type="text"', input)).toBe(true);
      expect(parseXPath('@type="checkbox"', input)).toBe(false);
    });

    it('should handle OR conditions', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      
      expect(parseXPath('self::div or self::span', div)).toBe(true);
      expect(parseXPath('self::div or self::span', span)).toBe(true);
    });

    it('should return false when all OR conditions fail', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'text');
      
      expect(parseXPath('self::button or @type="checkbox"', input)).toBe(false);
    });

    it('should handle nested outer parentheses', () => {
      const button = document.createElement('button');
      button.setAttribute('type', 'submit');
      
      expect(parseXPath('(self::button)', button)).toBe(true);
      expect(parseXPath('((self::button and @type="submit"))', button)).toBe(true);
    });

    it('should return false when any AND condition fails', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'text');
      
      expect(parseXPath('self::input and @type="checkbox"', input)).toBe(false);
    });
  });

  describe('splitByOperator', () => {
    it('should split by OR operator', () => {
      const result = splitByOperator('self::div or self::span', 'or');
      expect(result).toEqual(['self::div', 'self::span']);
    });

    it('should split by AND operator', () => {
      const result = splitByOperator('self::input and @type="text"', 'and');
      expect(result).toEqual(['self::input', '@type="text"']);
    });

    it('should handle nested parentheses', () => {
      const result = splitByOperator('(self::div or self::span) and @class', 'and');
      expect(result).toEqual(['(self::div or self::span)', '@class']);
    });
  });

  describe('parseCondition', () => {
    it('should match self::tag with uppercase tag name', () => {
      const button = document.createElement('button');
      expect(parseCondition('self::button', button)).toBe(true);
      expect(parseCondition('self::BUTTON', button)).toBe(true);
    });

    it('should match contains() expressions', () => {
      const el = document.createElement('div');
      el.setAttribute('class', 'dropdown-menu');
      
      expect(parseCondition("contains(@class, 'dropdown')", el)).toBe(true);
      expect(parseCondition("contains(@class, 'menu')", el)).toBe(true);
      expect(parseCondition("contains(@class, 'other')", el)).toBe(false);
    });

    it('should match descendant:: expressions', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      
      expect(parseCondition('descendant::span', parent)).toBe(true);
      expect(parseCondition('descendant::div', parent)).toBe(false);
    });

    it('should match ancestor:: expressions', () => {
      const grandparent = document.createElement('div');
      grandparent.id = 'ancestor-root';
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      grandparent.appendChild(parent);

      expect(parseCondition('ancestor::*[self::div]', child)).toBe(true);
      expect(parseCondition('ancestor::*[@id="missing"]', child)).toBe(false);
    });

    it('should match attribute existence expressions', () => {
      const input = document.createElement('input');
      input.setAttribute('required', '');

      expect(parseCondition('@required', input)).toBe(true);
      expect(parseCondition('@disabled', input)).toBe(false);
    });

    it('should return false for unknown conditions', () => {
      const div = document.createElement('div');

      expect(parseCondition('unknown-condition', div)).toBe(false);
    });
  });

  describe('ELEMENT_DEFINITIONS', () => {
    it('should be frozen and not modifiable', () => {
      expect(Object.isFrozen(ELEMENT_DEFINITIONS)).toBe(true);
    });

    it('should contain expected element types', () => {
      expect(ELEMENT_DEFINITIONS.button).toBeDefined();
      expect(ELEMENT_DEFINITIONS.textbox).toBeDefined();
      expect(ELEMENT_DEFINITIONS.link).toBeDefined();
      expect(ELEMENT_DEFINITIONS.element).toBe('true()');
    });
  });

  describe('getValidTypes', () => {
    it('should return array of valid type names', () => {
      const types = getValidTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('button');
      expect(types).toContain('textbox');
      expect(types).toContain('link');
      expect(types).toContain('element');
    });
  });

  describe('matchesType', () => {
    it('should return false for null element', () => {
      expect(matchesType(null, 'button')).toBe(false);
    });

    it('should match button elements', () => {
      const button = document.getElementById('btn1');
      expect(matchesType(button, 'button')).toBe(true);
    });

    it('should match textbox elements', () => {
      const textbox = document.getElementById('txt1');
      expect(matchesType(textbox, 'textbox')).toBe(true);
    });

    it('should match checkbox elements', () => {
      const checkbox = document.getElementById('chk1');
      expect(matchesType(checkbox, 'checkbox')).toBe(true);
    });

    it('should match radio elements', () => {
      const radio = document.getElementById('radio1');
      expect(matchesType(radio, 'radio')).toBe(true);
    });

    it('should match slider elements', () => {
      const slider = document.getElementById('slider1');
      expect(matchesType(slider, 'slider')).toBe(true);
    });

    it('should match datepicker elements', () => {
      const datepicker = document.getElementById('datepicker1');
      expect(matchesType(datepicker, 'datepicker')).toBe(true);
    });

    it('should match colorpicker elements', () => {
      const colorpicker = document.getElementById('colorpicker1');
      expect(matchesType(colorpicker, 'colorpicker')).toBe(true);
    });

    it('should match link elements', () => {
      const link = document.getElementById('link1');
      expect(matchesType(link, 'link')).toBe(true);
    });

    it('should match dropdown elements', () => {
      const dropdown = document.getElementById('dropdown1');
      expect(matchesType(dropdown, 'dropdown')).toBe(true);
    });

    it('should return false for unknown type', () => {
      const button = document.getElementById('btn1');
      expect(matchesType(button, 'unknown-type')).toBe(false);
    });
  });

  describe('getAllElements', () => {
    it('should return all elements in document', () => {
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

    it('should return elements from parent element only', () => {
      const container = document.querySelector('.container');
      const elements = getAllElements(container);
      // Container itself + span child
      expect(elements.length).toBe(2);
      expect(elements.some(el => el.tagName === 'SPAN')).toBe(true);
    });
  });

  describe('getBoundingBox', () => {
    it('should return bounding box with correct properties', () => {
      const button = document.getElementById('btn1');
      const box = getBoundingBox(button);
      
      expect(box).toHaveProperty('x');
      expect(box).toHaveProperty('y');
      expect(box).toHaveProperty('width');
      expect(box).toHaveProperty('height');
      expect(box).toHaveProperty('top');
      expect(box).toHaveProperty('bottom');
      expect(box).toHaveProperty('left');
      expect(box).toHaveProperty('right');
      expect(box).toHaveProperty('midx');
      expect(box).toHaveProperty('midy');
      expect(box).toHaveProperty('tagName');
      expect(box.tagName).toBe('button');
    });
  });

  describe('findElementsByType', () => {
    it('should return empty array for unknown type', () => {
      const result = findElementsByType('unknown-type');
      expect(result.elements).toEqual([]);
    });

    it('should throw TypeError for non-string type', () => {
      expect(() => findElementsByType(123)).toThrow(TypeError);
    });

    it('should find all button elements', () => {
      const result = findElementsByType('button');
      expect(result.elements.length).toBe(3);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('button');
      });
    });

    it('should find all textbox elements', () => {
      const result = findElementsByType('textbox');
      // 2 text inputs + 1 textarea
      expect(result.elements.length).toBe(3);
      result.elements.forEach(el => {
        expect(['input', 'textarea']).toContain(el.tagName);
      });
    });

    it('should find all datepicker elements', () => {
      const result = findElementsByType('datepicker');
      expect(result.elements.length).toBe(1);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('input');
      });
    });

    it('should find all colorpicker elements', () => {
      const result = findElementsByType('colorpicker');
      expect(result.elements.length).toBe(1);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('input');
      });
    });

    it('should find all link elements', () => {
      const result = findElementsByType('link');
      expect(result.elements.length).toBe(2);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('a');
      });
    });

    it('should find all elements with "element" type', () => {
      const result = findElementsByType('element');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should return elements with boundingBox and tagName', () => {
      const result = findElementsByType('button');
      expect(result.elements.length).toBeGreaterThan(0);
      
      const firstElement = result.elements[0];
      expect(firstElement).toHaveProperty('boundingBox');
      expect(firstElement).toHaveProperty('tagName');
      expect(firstElement).toHaveProperty('frameIndex');
    });

    it('should search within parent element when provided', () => {
      const container = document.querySelector('.container');
      const result = findElementsByType('element', container);
      // Container + span child, but innermost will be just span
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].tagName).toBe('span');
    });

    it('should default to "element" type when type is null', () => {
      const result = findElementsByType(null);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should default to "element" type when type is undefined', () => {
      const result = findElementsByType(undefined);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('getElementCounts', () => {
    it('should count all defined element types by visibility', () => {
      const counts = getElementCounts();

      expect(counts.button).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.textbox).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.checkbox).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.radio).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.slider).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.datepicker).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.colorpicker).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.link).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.dropdown).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.table).toEqual({ visible: 1, hidden: 0, total: 1 });
      expect(counts.row).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.column).toEqual({ visible: 6, hidden: 0, total: 6 });
      expect(counts.cell).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.element).toEqual({ visible: 31, hidden: 1, total: 32 });
    });

    it('should count a specific element type by visibility when provided', () => {
      expect(getElementCounts('button')).toEqual({ button: { visible: 3, hidden: 0, total: 3 } });
      expect(getElementCounts('textbox')).toEqual({ textbox: { visible: 3, hidden: 0, total: 3 } });
      expect(getElementCounts('link')).toEqual({ link: { visible: 2, hidden: 0, total: 2 } });
    });

    it('should separate visible and hidden elements', () => {
      const hiddenButton = document.createElement('button');
      hiddenButton.hidden = true;
      document.body.appendChild(hiddenButton);

      try {
        expect(getElementCounts('button')).toEqual({ button: { visible: 3, hidden: 1, total: 4 } });
      } finally {
        hiddenButton.remove();
      }
    });

    it('should count elements hidden by display none', () => {
      const hiddenButton = document.createElement('button');
      hiddenButton.style.display = 'none';
      document.body.appendChild(hiddenButton);

      try {
        expect(getElementCounts('button')).toEqual({ button: { visible: 3, hidden: 1, total: 4 } });
      } finally {
        hiddenButton.remove();
      }
    });

    it('should count elements hidden by visibility hidden', () => {
      const hiddenButton = document.createElement('button');
      hiddenButton.style.visibility = 'hidden';
      document.body.appendChild(hiddenButton);

      try {
        expect(getElementCounts('button')).toEqual({ button: { visible: 3, hidden: 1, total: 4 } });
      } finally {
        hiddenButton.remove();
      }
    });

    it('should count elements hidden by aria-hidden ancestor', () => {
      const menu = document.createElement('div');
      menu.setAttribute('aria-hidden', 'true');
      document.body.appendChild(menu);

      const link = document.createElement('a');
      link.href = '/nonprofits';
      link.textContent = 'Nonprofits';
      menu.appendChild(link);

      try {
        expect(isHidden(link)).toBe(true);
        expect(getElementCounts('link')).toEqual({ link: { visible: 2, hidden: 1, total: 3 } });
      } finally {
        menu.remove();
      }
    });

    it('should count elements hidden by inert ancestor', () => {
      const menu = document.createElement('div');
      menu.inert = true;
      document.body.appendChild(menu);

      const link = document.createElement('a');
      link.href = '/nonprofits';
      link.textContent = 'Nonprofits';
      menu.appendChild(link);

      try {
        expect(isHidden(link)).toBe(true);
        expect(getElementCounts('link')).toEqual({ link: { visible: 2, hidden: 1, total: 3 } });
      } finally {
        menu.remove();
      }
    });

    it('should count elements hidden by zero opacity ancestor', () => {
      const menu = document.createElement('div');
      menu.style.opacity = '0';
      document.body.appendChild(menu);

      const link = document.createElement('a');
      link.href = '/nonprofits';
      link.textContent = 'Nonprofits';
      menu.appendChild(link);

      try {
        expect(isHidden(link)).toBe(true);
        expect(getElementCounts('link')).toEqual({ link: { visible: 2, hidden: 1, total: 3 } });
      } finally {
        menu.remove();
      }
    });

    it('should count elements hidden by zero dimensions', () => {
      const hiddenButton = document.createElement('button');
      Object.defineProperty(hiddenButton, 'offsetWidth', { value: 0 });
      Object.defineProperty(hiddenButton, 'offsetHeight', { value: 0 });
      document.body.appendChild(hiddenButton);

      try {
        expect(getElementCounts('button')).toEqual({ button: { visible: 3, hidden: 1, total: 4 } });
      } finally {
        hiddenButton.remove();
      }
    });

    it('should count all defined types including generic element when requested', () => {
      const counts = getElementCounts('element');

      expect(counts.element).toEqual({
        visible: 31,
        hidden: 1,
        total: 32
      });
      expect(counts.button).toBeUndefined();
    });

    it('should count within a parent element when provided', () => {
      const container = document.querySelector('.container');

      expect(getElementCounts('element', container)).toEqual({ element: { visible: 2, hidden: 0, total: 2 } });
    });

    it('should match findElements counts for a specific element type', () => {
      const counts = getElementCounts('dropdown');
      const found = findElements('dropdown').elements.length;

      expect(counts.dropdown.total).toBe(found);
    });

    it('should return zero for unknown type by default', () => {
      expect(getElementCounts('unknown-type')).toEqual({
        'unknown-type': { visible: 0, hidden: 0, total: 0 }
      });
    });

    it('should throw TypeError for non-string type', () => {
      expect(() => getElementCounts(123)).toThrow(TypeError);
    });
  });

  describe('highlight', () => {
    it('should highlight elements with default color', () => {
      const button = document.getElementById('btn1');
      const result = findElementsByType('button');
      
      highlight(result.elements);
      
      expect(button.style.outline).toContain('solid');
      expect(button.style.outline).toContain('red');
      expect(button.classList.contains('elementfinder-highlighted')).toBe(true);
    });

    it('should highlight elements with custom color', () => {
      const button = document.getElementById('btn1');
      const result = findElementsByType('button');
      
      highlight(result.elements);
      
      expect(button.style.outline).toContain('red');
      expect(button.style.outline).toContain('3px');
    });

    it('should handle null elements gracefully', () => {
      expect(() => highlight(null)).not.toThrow();
    });
  });

  describe('unhighlight', () => {
    it('should remove highlighting from elements', () => {
      const button = document.getElementById('btn1');
      const result = findElementsByType('button');
      
      highlight(result.elements);
      unhighlight(result.elements);
      
      expect(button.style.outline).toBe('');
      expect(button.style.outlineOffset).toBe('');
      expect(button.style.boxShadow).toBe('');
      expect(button.classList.contains('elementfinder-highlighted')).toBe(false);
    });
  });
});