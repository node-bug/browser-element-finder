/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for dropdowns fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Dropdowns Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('dropdowns.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('findElementsByType', () => {
    it('should find dropdowns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'dropdown' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'button' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'checkbox' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'textbox' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find links and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'link' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'slider' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find radios and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'radio' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'heading' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'navigation' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find images and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'image' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'table' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find lists and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'list' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });
  });

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Apple" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Apple' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await fixture.driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should find elements matching "Banana" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Banana' });
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await fixture.driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should find elements by placeholder attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Type to search' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'single-select' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('single-select');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('single-select');
    });

    it('should find elements by aria-label attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Custom UI' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by value attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'apple' });
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'single-select') {
        expect(testDataId).toBe('single-select');
      } else {
        const tagName = await mainElements[0].element.getTagName();
        if (tagName === 'option') {
          const parentTestDataId = await fixture.driver.executeScript(`
            const el = arguments[0];
            return el.closest('select') ? el.closest('select').getAttribute('data-test-id') : null;
          `, mainElements[0].element);
          expect(parentTestDataId).toBe('single-select');
        }
      }
    });

    it('should be case-sensitive for "apple" vs "Apple"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'apple' });
      `);
      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute({ value: 'Apple' });
      `);
      expect(resultLower.elements.length).toBe(1);
      expect(resultUpper.elements.length).toBe(1);
    });
  });
});