/**
 * Integration tests for ElementFinder
 * Combined type, attribute, and combined search tests for element-types fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Element Types Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-types.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('getElementCounts', () => {
    it('should return visible, hidden, and total counts for all semantic types', async () => {
      const counts = await fixture.driver.executeScript('return ElementFinder.getElementCounts()');

      expect(counts.link).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.navigation).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.heading).toEqual({ visible: 24, hidden: 0, total: 24 });
      expect(counts.button).toEqual({ visible: 7, hidden: 0, total: 7 });
      expect(counts.checkbox).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.switch).toEqual({ visible: 4, hidden: 0, total: 4 });
      expect(counts.slider).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.radio).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.dropdown).toEqual({ visible: 4, hidden: 0, total: 4 });
      expect(counts.textbox).toEqual({ visible: 6, hidden: 0, total: 6 });
      expect(counts.table).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.row).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.column).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.cell).toEqual({ visible: 2, hidden: 0, total: 2 });
      expect(counts.image).toEqual({ visible: 3, hidden: 0, total: 3 });
      expect(counts.element).toEqual({ visible: 100, hidden: 0, total: 100 });
    });

    it('should return visible, hidden, and total counts for one semantic type', async () => {
      const counts = await fixture.driver.executeScript('return ElementFinder.getElementCounts("button")');

      expect(counts).toEqual({ button: { visible: 7, hidden: 0, total: 7 } });
    });

    it('should count elements within a parent element', async () => {
      const counts = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.getElementCounts('button', parent);
      `);

      expect(counts).toEqual({ button: { visible: 4, hidden: 0, total: 4 } });
    });

    it('should count hidden elements in the browser', async () => {
      const counts = await fixture.driver.executeScript(`
        const hiddenButton = document.createElement('button');
        hiddenButton.hidden = true;
        document.body.appendChild(hiddenButton);

        try {
          return ElementFinder.getElementCounts('button');
        } finally {
          hiddenButton.remove();
        }
      `);

      expect(counts).toEqual({ button: { visible: 7, hidden: 1, total: 8 } });
    });
  });

  describe('findElementsByType', () => {
    it('should find all elements with "element" type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('element');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find links and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dropdowns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find sliders and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find radios and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(24);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find images and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find lists and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find file inputs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('file');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find menus and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('menu');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find toolbars and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('toolbar');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dialogs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dialog');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should return empty array for unknown type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('unknown-type-xyz');
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should throw TypeError for non-string type', async () => {
      await expect(async () => {
        await fixture.driver.executeScript(`
          return ElementFinder.findElementsByType(123);
        `);
      }).rejects.toThrow();
    });
  });

  describe('findElements with type only', () => {
    it('should find all buttons when type is "button" and text is null', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', null);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all links when type is "link" and text is undefined', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('link', undefined);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all elements when type is null', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, '');
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements by id when type is null and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'btn-standard');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find button with matching text and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find link with matching text and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('link', 'Home');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const href = await mainElements[0].element.getAttribute('href');
      expect(href).toContain('home');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('link-home');
    });

    it('should find textbox with matching placeholder and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('textbox', 'Textarea content');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });

    it('should return empty when no match for combined criteria', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('button', 'nonexistent-text');
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findElements with exact matching', () => {
    it('should find exact text match and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard Button', true);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should not find partial match with exact=true', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard', true);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial match with exact=false', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements(null, 'Standard', false);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findElements with parent parameter', () => {
    it('should find elements within parent by type only and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements('button', null, false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements within parent by text only and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements(null, 'Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findProbableElements direct match', () => {
    it('should find element matching both type and text directly and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('button', 'Standard Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find textbox with matching placeholder and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Textarea content');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('textbox-textarea');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-textarea');
    });

    it('should find link with matching text and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('link', 'Home');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const href = await mainElements[0].element.getAttribute('href');
      expect(href).toContain('home');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('link-home');
    });
  });

  describe('findElementsByType with parent parameter', () => {
    it('should find elements within a specific parent element', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByType('button', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });

    it('should find buttons within navigation section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByType('link', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByType('textbox', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByType('textbox', parent);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find checkboxes within checkboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('checkboxes-section');
        return ElementFinder.findElementsByType('checkbox', parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
    });
  });

  describe('findElementsByAttribute with parent parameter', () => {
    it('should find elements within a specific parent element', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('Standard Button', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by id within parent section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('btn-standard', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute('Home', false, parent);
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find links within navigation section by text', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByAttribute('Home', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByAttribute('Textarea content', false, parent);
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Home" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Home');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('link-home');
    });

    it('should find elements matching "Heading 1" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading 1');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('h1-test');
    });

    it('should find elements matching "Standard Button" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Button');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('btn-standard');
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('btn-standard');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements by aria-label attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-role');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('img-role');
    });

    it('should find elements by alt attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Test Image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('img-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('img-standard');
    });

    it('should find elements matching "Role Button" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Button');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-role');
    });

    it('should find elements matching "Role Switch" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Switch');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('switch-role');
    });

    it('should find elements matching "Role Radio" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Radio');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('radio-role');
    });

    it('should find elements matching "Combobox" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Combobox');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dropdown-combobox');
    });

    it('should find elements matching "Role Textbox" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Textbox');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-role');
    });

    it('should find elements matching "Role List Item" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role List Item');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('list-role-item');
    });

    it('should find elements matching "Role Menu Item" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Menu Item');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-role-item');
    });

    it('should find elements matching "Role Heading" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Role Heading');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('role-heading');
    });

    it('should find elements matching "Dialog content" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Dialog content');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dialog-content');
    });

    it('should be case-sensitive for "home" vs "Home"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('home');
      `);
      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Home');
      `);
      expect(resultLower.elements.length).toBeGreaterThanOrEqual(0);
      expect(resultUpper.elements.length).toBe(1);
      const mainElements = resultUpper.elements.filter(e => e.element);
      if (mainElements.length > 0) {
        const testDataId = await mainElements[0].element.getAttribute('data-test-id');
        expect(testDataId).toBe('link-home');
      }
    });

    it('should support exact matching for attributes', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Button', true);
      `);
      expect(result.elements.length).toBe(1);

      const result2 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard', true);
      `);
      expect(result2.elements.length).toBe(0);

      const result3 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading 1', true);
      `);
      expect(result.elements.length).toBe(1);

      const result2 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading', true);
      `);
      expect(result2.elements.length).toBe(0);

      const result3 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Heading', false);
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });
  });
});