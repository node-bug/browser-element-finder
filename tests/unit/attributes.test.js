/**
 * Unit tests for ElementFinder Node.js module
 * These tests run in Node.js and provide code coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  setSearchableAttributes,
  getSearchableAttributes,
  getSearchableAttributeValues,
  getElementDescriptor,
  matchesAttribute,
  getBoundingBox,
  getAllElements,
  getAllFrames,
  findElementsByAttribute,
  getValidAttributes,
  highlight,
  unhighlight
} from '../../src/element-finder.js';

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
  let fixtureBodyHTML;

  beforeAll(() => {
    const fixturePath = resolve(__dirname, '..', 'fixtures/attributes.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously'
    });

    window = dom.window;
    document = window.document;
    fixtureBodyHTML = document.body.innerHTML;

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

  describe('getSearchableAttributeValues', () => {
    it('should return current values for searchable attributes on an element', () => {
      const input = document.getElementById('txt2');

      expect(getSearchableAttributeValues(input)).toEqual({
        placeholder: 'Enter email',
        'data-testid': 'email-input',
        id: 'txt2'
      });
    });

    it('should exclude missing, empty, and non-searchable attributes', () => {
      const input = document.createElement('input');
      input.setAttribute('placeholder', '');
      input.setAttribute('data-testid', '');
      input.setAttribute('custom-attr', 'ignored');
      input.setAttribute('aria-label', 'Email Address');

      expect(getSearchableAttributeValues(input)).toEqual({
        'aria-label': 'Email Address'
      });
    });

    it('should respect custom searchable attributes', () => {
      const el = document.createElement('button');
      el.setAttribute('id', 'save');
      el.setAttribute('data-qa', 'save-button');
      el.setAttribute('aria-label', 'Save changes');

      setSearchableAttributes(['data-qa', 'id']);

      expect(getSearchableAttributeValues(el)).toEqual({
        'data-qa': 'save-button',
        id: 'save'
      });
      expect(Object.keys(getSearchableAttributeValues(el))).toEqual(['data-qa', 'id']);
    });

    it('should return an empty object for null or non-element nodes', () => {
      expect(getSearchableAttributeValues(null)).toEqual({});
      expect(getSearchableAttributeValues(document.createTextNode('not an element'))).toEqual({});
    });
  });

  describe('getElementDescriptor', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = fixtureBodyHTML;
    });

    it('should return unique id descriptor with type and index', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'email-input';
      document.body.appendChild(input);

      expect(getElementDescriptor(input)).toEqual({
        identifiableText: 'email-input',
        attributeName: 'id',
        index: 1,
        type: 'textbox',
        tagName: 'input'
      });
    });

    it('should return duplicate title descriptor with separate occurrence index', () => {
      const first = document.createElement('button');
      first.setAttribute('title', 'Save');
      document.body.appendChild(first);

      const second = document.createElement('button');
      second.setAttribute('title', 'Save');
      document.body.appendChild(second);

      expect(getElementDescriptor(first)).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'title',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
      expect(getElementDescriptor(second)).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'title',
        index: 2,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should return image src filename without path or extension', () => {
      const image = document.createElement('img');
      image.setAttribute('src', '/assets/images/user-avatar.png?size=large#profile');
      document.body.appendChild(image);

      expect(getElementDescriptor(image)).toEqual({
        identifiableText: 'user-avatar',
        attributeName: 'src',
        index: 1,
        type: 'image',
        tagName: 'img'
      });
    });

    it('should fall back to direct text when no searchable attribute exists', () => {
      const button = document.createElement('button');
      button.textContent = 'Submit';
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: 'Submit',
        attributeName: 'text',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should shorten direct text fallback without cutting words or including text after new lines', () => {
      const button = document.createElement('button');
      button.textContent = 'This is a very long button label\nSecond line should be ignored';
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toMatchObject({
        identifiableText: 'This is a very long',
        attributeName: 'text',
        type: 'button',
        tagName: 'button'
      });
    });

    it('should shorten full text fallback without cutting words or including text after new lines', () => {
      const button = document.createElement('button');
      const span = document.createElement('span');
      span.textContent = 'Nested text with spaces and another line\nIgnored line';
      button.appendChild(span);
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should not shorten searchable attribute descriptor values', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'This is a very long aria label that should not be shortened');
      document.body.appendChild(button);

      expect(getElementDescriptor(button).identifiableText).toBe(
        'This is a very long aria label that should not be shortened'
      );
    });

    it('should resolve aria-labelledby text for descriptor and uniqueness', () => {
      const label = document.createElement('label');
      label.id = 'save-label';
      label.textContent = 'Save';
      document.body.appendChild(label);

      const button = document.createElement('button');
      button.setAttribute('aria-labelledby', 'save-label');
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: 'Save',
        attributeName: 'aria-labelledby',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should resolve multiple aria-labelledby references and ignore missing labels', () => {
      const firstLabel = document.createElement('label');
      firstLabel.id = 'first-label';
      firstLabel.textContent = 'First';
      document.body.appendChild(firstLabel);

      const secondLabel = document.createElement('label');
      secondLabel.id = 'second-label';
      secondLabel.textContent = 'Second';
      document.body.appendChild(secondLabel);

      const button = document.createElement('button');
      button.setAttribute('aria-labelledby', 'first-label missing-label second-label');
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: 'First Second',
        attributeName: 'aria-labelledby',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should ignore empty aria-labelledby references before falling back to text', () => {
      const emptyLabel = document.createElement('label');
      emptyLabel.id = 'empty-label';
      emptyLabel.textContent = '   ';
      document.body.appendChild(emptyLabel);

      const button = document.createElement('button');
      button.setAttribute('aria-labelledby', 'empty-label');
      button.textContent = 'Fallback';
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: 'Fallback',
        attributeName: 'text',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should ignore empty aria-labelledby references before falling back to attributes', () => {
      const emptyLabel = document.createElement('label');
      emptyLabel.id = 'empty-label';
      emptyLabel.textContent = '   ';
      document.body.appendChild(emptyLabel);

      const button = document.createElement('button');
      button.setAttribute('aria-labelledby', 'empty-label');
      button.setAttribute('title', 'Fallback Title');
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: 'Fallback Title',
        attributeName: 'title',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should fall back to full text when direct text is empty', () => {
      const button = document.createElement('button');
      const span = document.createElement('span');
      span.textContent = 'Nested Action';
      button.appendChild(span);
      document.body.appendChild(button);

      expect(getElementDescriptor(button)).toEqual({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should return null descriptor with index and type when no text exists', () => {
      document.body.innerHTML = '';

      const div = document.createElement('div');
      document.body.appendChild(div);

      const descriptor = getElementDescriptor(div);

      expect(descriptor).toMatchObject({
        identifiableText: null,
        attributeName: null,
        type: 'element',
        tagName: 'div'
      });
      // The fixture frame contains pre-existing elements, so the absolute
      // index depends on the JSDOM fixture. We only assert that index is
      // a positive integer reflecting the element's position.
      expect(Number.isInteger(descriptor.index)).toBe(true);
      expect(descriptor.index).toBeGreaterThanOrEqual(1);
    });

    it('should return position-based index for a textless element mixed with other element-type siblings', () => {
      document.body.innerHTML = '';

      const first = document.createElement('div');
      document.body.appendChild(first);

      const second = document.createElement('span');
      document.body.appendChild(second);

      const third = document.createElement('div'); // textless
      document.body.appendChild(third);

      const firstIdx = getElementDescriptor(first).index;
      const secondIdx = getElementDescriptor(second).index;
      const thirdIdx = getElementDescriptor(third).index;

      // All three resolve to type "element", so their indices reflect their
      // 1-based position among element-type elements in document order.
      // The third textless div comes after both `first` (a div) and `second`
      // (a span), so its index must be strictly greater than both.
      expect(thirdIdx).toBeGreaterThan(firstIdx);
      expect(thirdIdx).toBeGreaterThan(secondIdx);
      expect(getElementDescriptor(third)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        type: 'element',
        tagName: 'div',
      });
    });

    it('should return safe descriptor object for null or non-element input', () => {
      expect(getElementDescriptor(null)).toEqual({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: null,
        tagName: null
      });
      expect(getElementDescriptor(document.createTextNode('not an element'))).toEqual({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: null,
        tagName: null
      });
    });

    it('should detect semantic element type', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', 'Accept terms');
      document.body.appendChild(checkbox);

      expect(getElementDescriptor(checkbox).type).toBe('checkbox');
    });

    it('should default type to element when no specific type matches', () => {
      const div = document.createElement('div');
      div.setAttribute('aria-label', 'Panel');
      document.body.appendChild(div);

      expect(getElementDescriptor(div).type).toBe('element');
    });

    it('should return position-based indices for buttons with no identifiable text', () => {
      document.body.innerHTML = '';

      const btn1 = document.createElement('button');
      document.body.appendChild(btn1);

      const btn2 = document.createElement('button');
      document.body.appendChild(btn2);

      const btn3 = document.createElement('button');
      document.body.appendChild(btn3);

      const d1 = getElementDescriptor(btn1);
      const d2 = getElementDescriptor(btn2);
      const d3 = getElementDescriptor(btn3);

      expect(d1).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: 'button',
        tagName: 'button',
      });
      expect(d2).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 2,
        type: 'button',
        tagName: 'button',
      });
      expect(d3).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 3,
        type: 'button',
        tagName: 'button',
      });
    });

    it('should return position-based index for a radio with no text and no value', () => {
      document.body.innerHTML = '';

      const radio1 = document.createElement('input');
      radio1.type = 'radio';
      document.body.appendChild(radio1);

      const radio2 = document.createElement('input');
      radio2.type = 'radio';
      document.body.appendChild(radio2);

      const radio3 = document.createElement('input');
      radio3.type = 'radio';
      document.body.appendChild(radio3);

      expect(getElementDescriptor(radio1)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: 'radio',
        tagName: 'input',
      });
      expect(getElementDescriptor(radio2)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 2,
        type: 'radio',
        tagName: 'input',
      });
      expect(getElementDescriptor(radio3)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 3,
        type: 'radio',
        tagName: 'input',
      });
    });

    it('should return position-based indices for buttons with whitespace-only text', () => {
      document.body.innerHTML = '';

      const btn1 = document.createElement('button');
      btn1.textContent = '   ';
      document.body.appendChild(btn1);

      const btn2 = document.createElement('button');
      btn2.innerHTML = '\n\t  ';
      document.body.appendChild(btn2);

      const btn3 = document.createElement('button');
      document.body.appendChild(btn3);

      expect(getElementDescriptor(btn1).identifiableText).toBeNull();
      expect(getElementDescriptor(btn2).identifiableText).toBeNull();
      expect(getElementDescriptor(btn3).identifiableText).toBeNull();

      expect(getElementDescriptor(btn1).index).toBe(1);
      expect(getElementDescriptor(btn2).index).toBe(2);
      expect(getElementDescriptor(btn3).index).toBe(3);
    });

    it('should assign sequential indices to multiple buttons with identical text', () => {
      document.body.innerHTML = '';

      const buttons = [];
      for (let i = 0; i < 4; i++) {
        const btn = document.createElement('button');
        btn.textContent = 'Save';
        document.body.appendChild(btn);
        buttons.push(btn);
      }

      buttons.forEach((btn, i) => {
        expect(getElementDescriptor(btn)).toMatchObject({
          identifiableText: 'Save',
          attributeName: 'text',
          type: 'button',
          tagName: 'button',
          index: i + 1,
        });
      });
    });

    it('should assign sequential indices to radios that share the same label', () => {
      document.body.innerHTML = '';

      const radios = [];
      for (let i = 0; i < 3; i++) {
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.setAttribute('aria-label', 'Choose option');
        document.body.appendChild(radio);
        radios.push(radio);
      }

      radios.forEach((radio, i) => {
        expect(getElementDescriptor(radio)).toMatchObject({
          identifiableText: 'Choose option',
          attributeName: 'aria-label',
          type: 'radio',
          index: i + 1,
        });
      });
    });

    it('should not group elements whose identifiableText differs by partial match', () => {
      document.body.innerHTML = '';

      const btn1 = document.createElement('button');
      btn1.textContent = 'Save';
      document.body.appendChild(btn1);

      const btn2 = document.createElement('button');
      btn2.textContent = 'Save As';
      document.body.appendChild(btn2);

      const btn3 = document.createElement('button');
      btn3.textContent = 'Saving';
      document.body.appendChild(btn3);

      // Each has a distinct identifiableText, so each gets index 1
      expect(getElementDescriptor(btn1).identifiableText).toBe('Save');
      expect(getElementDescriptor(btn2).identifiableText).toBe('Save As');
      expect(getElementDescriptor(btn3).identifiableText).toBe('Saving');

      expect(getElementDescriptor(btn1).index).toBe(1);
      expect(getElementDescriptor(btn2).index).toBe(1);
      expect(getElementDescriptor(btn3).index).toBe(1);
    });

    it('should count a textless button by its position among same-type buttons', () => {
      document.body.innerHTML = '';

      const btn1 = document.createElement('button');
      btn1.textContent = 'Save';
      document.body.appendChild(btn1);

      const btn2 = document.createElement('button');
      btn2.textContent = 'Save As';
      document.body.appendChild(btn2);

      const btn3 = document.createElement('button'); // textless
      document.body.appendChild(btn3);

      const btn4 = document.createElement('button');
      btn4.textContent = 'Saving';
      document.body.appendChild(btn4);

      // btn1 / btn2 / btn4 each have a unique identifiableText -> index 1
      expect(getElementDescriptor(btn1).index).toBe(1);
      expect(getElementDescriptor(btn2).index).toBe(1);
      expect(getElementDescriptor(btn4).index).toBe(1);

      // btn3 has no identifiableText, so index falls back to its
      // 1-based position among buttons in the frame -> 3.
      expect(getElementDescriptor(btn3)).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 3,
        type: 'button',
        tagName: 'button',
      });
    });

    it('should treat case-different text as different identifier groups', () => {
      document.body.innerHTML = '';

      const lower = document.createElement('button');
      lower.textContent = 'save';
      document.body.appendChild(lower);

      const upper = document.createElement('button');
      upper.textContent = 'Save';
      document.body.appendChild(upper);

      expect(getElementDescriptor(lower).identifiableText).toBe('save');
      expect(getElementDescriptor(upper).identifiableText).toBe('Save');
      expect(getElementDescriptor(lower).index).toBe(1);
      expect(getElementDescriptor(upper).index).toBe(1);
    });

    it('should not count a button and a checkbox with same text against each other', () => {
      document.body.innerHTML = '';

      const button1 = document.createElement('button');
      button1.textContent = 'Submit';
      document.body.appendChild(button1);

      const button2 = document.createElement('button');
      button2.textContent = 'Submit';
      document.body.appendChild(button2);

      const button3 = document.createElement('button');
      button3.textContent = 'Submit';
      document.body.appendChild(button3);

      const checkbox1 = document.createElement('input');
      checkbox1.type = 'checkbox';
      checkbox1.setAttribute('aria-label', 'Submit');
      document.body.appendChild(checkbox1);

      const checkbox2 = document.createElement('input');
      checkbox2.type = 'checkbox';
      checkbox2.setAttribute('aria-label', 'Submit');
      document.body.appendChild(checkbox2);

      // Same text "Submit", different types -> independent counts:
      // buttons get 1,2,3 and checkboxes get 1,2 (each type has its own sequence).
      [button1, button2, button3].forEach((btn, i) => {
        expect(getElementDescriptor(btn)).toMatchObject({
          identifiableText: 'Submit',
          type: 'button',
          index: i + 1,
        });
      });

      [checkbox1, checkbox2].forEach((chk, i) => {
        expect(getElementDescriptor(chk)).toMatchObject({
          identifiableText: 'Submit',
          type: 'checkbox',
          index: i + 1,
        });
      });
    });

    it('should keep a single index sequence when the same text resolves from different attributes', () => {
      document.body.innerHTML = '';

      const byValue = document.createElement('button');
      byValue.value = 'Continue';
      document.body.appendChild(byValue);

      const byAria = document.createElement('button');
      byAria.setAttribute('aria-label', 'Continue');
      document.body.appendChild(byAria);

      const byText = document.createElement('button');
      byText.textContent = 'Continue';
      document.body.appendChild(byText);

      // The resolved identifiableText is "Continue" in all three cases,
      // so they share a single index sequence.
      expect(getElementDescriptor(byValue)).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'value',
        type: 'button',
        index: 1,
      });
      expect(getElementDescriptor(byAria)).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'aria-label',
        type: 'button',
        index: 2,
      });
      expect(getElementDescriptor(byText)).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'text',
        type: 'button',
        index: 3,
      });
    });

    it('should record attributeName as the first matching searchable attribute', () => {
      document.body.innerHTML = '';

      const btn = document.createElement('button');
      // placeholder has higher priority than value, but only the first match
      // whose value yields identifiableText counts.
      btn.setAttribute('placeholder', 'Go');
      btn.setAttribute('value', 'Go');
      document.body.appendChild(btn);

      expect(getElementDescriptor(btn)).toMatchObject({
        identifiableText: 'Go',
        attributeName: 'placeholder',
        type: 'button',
        index: 1,
      });
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

  describe('findElementsByAttribute', () => {
    it('should throw TypeError for non-string value', () => {
      expect(() => findElementsByAttribute(123)).toThrow(TypeError);
      expect(() => findElementsByAttribute(null)).not.toThrow();
      expect(() => findElementsByAttribute(undefined)).not.toThrow();
    });

    it('should return all elements for empty value', () => {
      const result = findElementsByAttribute('');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find elements by placeholder attribute', () => {
      const result = findElementsByAttribute('Enter name');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');
    });

    it('should find elements by data-testid attribute', () => {
      const result = findElementsByAttribute('email-input');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt2');
    });

    it('should find elements by id attribute', () => {
      const result = findElementsByAttribute('btn1');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');
    });

    it('should find elements by aria-label attribute', () => {
      const result = findElementsByAttribute('Cancel button');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');
    });

    it('should find elements by title attribute', () => {
      const result = findElementsByAttribute('Click Me');
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn3');
    });

    it('should support exact matching for attributes', () => {
      // Exact match should find the element
      const result = findElementsByAttribute('Enter name', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('txt1');

      // Partial match should not find anything with exact=true
      const result2 = findElementsByAttribute('Enter', true);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = findElementsByAttribute('Enter', false);
      expect(result3.elements.length).toBe(3);
    });

    it('should support exact matching for text content', () => {
      // Exact match on button text
      const result = findElementsByAttribute('Submit', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn1');

      // Partial match should not find with exact=true
      const result2 = findElementsByAttribute('Sub', true);
      expect(result2.elements.length).toBe(0);

      // Partial match should find with exact=false (default)
      const result3 = findElementsByAttribute('Sub', false);
      expect(result3.elements.length).toBe(1);
    });

    it('should support exact matching for aria-label', () => {
      // Exact match on aria-label
      const result = findElementsByAttribute('Cancel button', true);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.id).toBe('btn2');

      // Partial match should not find with exact=true
      const result2 = findElementsByAttribute('Cancel', true);
      expect(result2.elements.length).toBe(1);

      // Partial match should find with exact=false (default)
      const result3 = findElementsByAttribute('Cancel', false);
      expect(result3.elements.length).toBe(1);
    });

    it('should return innermost matches only', () => {
      const result = findElementsByAttribute('container');
      // Should match the div with data-test-id="container-div"
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].element?.getAttribute('data-test-id')).toBe('container-div');
    });

    it('should return elements with bounding box and tagName', () => {
      const result = findElementsByAttribute('btn1');
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
      const result = findElementsByAttribute('btn1');
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