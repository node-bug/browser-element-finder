/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for tables fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Tables Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('tables.html'),
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
    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find rows and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('row');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(120);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find cells and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('cell');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(240);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find columns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('column');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(256);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find links and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dropdowns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find lists and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('list');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });
  });

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Alice" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Alice');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-alice-name');
    });

    it('should find elements matching "New York" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('New York');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-alice-city');
    });

    it('should find elements matching "Laptop" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Laptop');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-laptop');
    });

    it('should find elements matching "Electronics" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Electronics');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('td-electronics');
    });

    it('should find elements by id attribute "simple-table" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('simple-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by id attribute "span-table" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('span-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('span-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('span-table');
    });

    it('should find elements by id attribute "outer-table" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('outer-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('outer-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('outer-table');
    });

    it('should find elements by id attribute "inner-table" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('inner-table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('inner-table');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('inner-table');
    });

    it('should find elements matching "View" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('View');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-active');
    });

    it('should find elements matching "Activate" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Activate');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('btn-inactive');
    });

    it('should find elements matching "Total" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Total');
      `);
      expect(result.elements.length).toBe(1);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'td-total') {
        expect(testDataId).toBe('td-total');
      } else {
        const parentTestDataId = await fixture.driver.executeScript(`
          const el = arguments[0];
          return el.closest('td') ? el.closest('td').getAttribute('data-test-id') : null;
        `, mainElements[0].element);
        expect(parentTestDataId).toBe('td-total');
      }
    });

    it('should be case-sensitive for "alice" vs "Alice"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('alice');
      `);
      expect(resultLower.elements.length).toBe(3);
      const testDataIdL = await resultLower.elements[0].element.getAttribute('data-test-id');
      expect(testDataIdL).toMatch(/td-alice-/);

      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Alice');
      `);
      expect(resultUpper.elements.length).toBeGreaterThanOrEqual(1);
      const mainElements = resultUpper.elements.filter(e => e.element);
      if (mainElements.length > 0) {
        const testDataId = await mainElements[0].element.getAttribute('data-test-id');
        expect(testDataId).toMatch(/td-alice-/);
      }
    });
  });
});