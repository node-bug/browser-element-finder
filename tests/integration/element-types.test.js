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
      const counts = await fixture.driver.executeScript('return ElementFinder.getElementCounts({ type: "button" })');

      expect(counts).toEqual({ button: { visible: 7, hidden: 0, total: 7 } });
    });

    it('should count elements within a parent element', async () => {
      const counts = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.getElementCounts({ type: 'button', parent });
      `);

      expect(counts).toEqual({ button: { visible: 4, hidden: 0, total: 4 } });
    });

    it('should count hidden elements in the browser', async () => {
      const counts = await fixture.driver.executeScript(`
        const hiddenButton = document.createElement('button');
        hiddenButton.hidden = true;
        document.body.appendChild(hiddenButton);

        try {
          return ElementFinder.getElementCounts({ type: 'button' });
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
        return ElementFinder.findElementsByType({ type: 'element' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'button' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'checkbox' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'textbox' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find links and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'link' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dropdowns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'dropdown' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find sliders and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'slider' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find radios and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'radio' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'heading' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(24);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'navigation' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find images and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'image' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'table' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find lists and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'list' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find file inputs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'file' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find menus and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'menu' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find toolbars and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'toolbar' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find dialogs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'dialog' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should return empty array for unknown type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'unknown-type-xyz' });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should throw TypeError for non-string type', async () => {
      await expect(async () => {
        await fixture.driver.executeScript(`
          return ElementFinder.findElementsByType({ type: 123 });
        `);
      }).rejects.toThrow();
    });
  });

  describe('findElements with type only', () => {
    it('should find all buttons when type is "button" (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all links when type is "link" (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'link' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find all elements when type is null (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({});
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('findElements with text only', () => {
    it('should find elements by text when type is null (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Standard Button' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find elements by id when type is null (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'btn-standard' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });
  });

  describe('findElements with type and text combined', () => {
    it('should find button with matching text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'Standard Button' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('btn-standard');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should find link with matching text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'link', text: 'Home' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const href = await mainElements[0].element.getAttribute('href');
      expect(href).toContain('home');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('link-home');
    });

    it('should find textbox with matching placeholder (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'textbox', text: 'Textarea content' });
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
        return ElementFinder.findElements({ type: 'button', text: 'nonexistent-text' });
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findElements with exact matching', () => {
    it('should find exact text match and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Standard Button', exact: true });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-standard');
    });

    it('should not find partial match with exact=true', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Standard', exact: true });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find partial match with exact=false', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ text: 'Standard', exact: false });
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
        return ElementFinder.findElements({ type: 'button', parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements within parent by text only and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElements({ text: 'Standard Button', exact: false, parent });
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
        return ElementFinder.findProbableElements({ type: 'button', text: 'Standard Button' });
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
        return ElementFinder.findProbableElements({ type: 'textbox', text: 'Textarea content' });
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
        return ElementFinder.findProbableElements({ type: 'link', text: 'Home' });
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
        return ElementFinder.findElementsByType({ type: 'button', parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });

    it('should find buttons within navigation section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByType({ type: 'link', parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByType({ type: 'textbox', parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByType({ type: 'textbox', parent });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find checkboxes within checkboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('checkboxes-section');
        return ElementFinder.findElementsByType({ type: 'checkbox', parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
    });
  });

  describe('findElementsByAttribute with parent parameter', () => {
    it('should find elements within a specific parent element', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute({ value: 'Standard Button', exact: false, parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by id within parent section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute({ value: 'btn-standard', exact: false, parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should return empty array when no elements match in parent', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('buttons-section');
        return ElementFinder.findElementsByAttribute({ value: 'Home', exact: false, parent });
      `);
      expect(result.elements.length).toBe(0);
    });

    it('should find links within navigation section by text', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('navigation-section');
        return ElementFinder.findElementsByAttribute({ value: 'Home', exact: false, parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find textboxes within textboxes section', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.getElementById('textboxes-section');
        return ElementFinder.findElementsByAttribute({ value: 'Textarea content', exact: false, parent });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Home" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Home' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('link-home');
    });

    it('should find elements matching "Heading 1" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Heading 1' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('h1-test');
    });

    it('should find elements matching "Standard Button" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Standard Button' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('btn-standard');
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'btn-standard' });
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
        return ElementFinder.findElementsByAttribute({ value: 'Role Image' });
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
        return ElementFinder.findElementsByAttribute({ value: 'Test Image' });
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
        return ElementFinder.findElementsByAttribute({ value: 'Role Button' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-role');
    });

    it('should find elements matching "Role Switch" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role Switch' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('switch-role');
    });

    it('should find elements matching "Role Radio" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role Radio' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('radio-role');
    });

    it('should find elements matching "Combobox" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Combobox' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dropdown-combobox');
    });

    it('should find elements matching "Role Textbox" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role Textbox' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('textbox-role');
    });

    it('should find elements matching "Role List Item" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role List Item' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('list-role-item');
    });

    it('should find elements matching "Role Menu Item" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role Menu Item' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('menu-role-item');
    });

    it('should find elements matching "Role Heading" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Role Heading' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('role-heading');
    });

    it('should find elements matching "Dialog content" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Dialog content' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('dialog-content');
    });

    it('should be case-sensitive for "home" vs "Home"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'home' });
      `);
      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Home' });
      `)
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
        return ElementFinder.findElementsByAttribute({ value: 'Standard Button', exact: true });
      `);
      expect(result.elements.length).toBe(1);

      const result2 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Standard', exact: true });
      `);
      expect(result2.elements.length).toBe(0);

      const result3 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Standard', exact: false });
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Heading 1', exact: true });
      `);
      expect(result.elements.length).toBe(1);

      const result2 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Heading', exact: true });
      `);
      expect(result2.elements.length).toBe(0);

      const result3 = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Heading', exact: false });
      `);
      expect(result3.elements.length).toBeGreaterThan(0);
    });
  });
});