/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for radio-iframe-table fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Radio iFrame Table Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('radio-iframe-table.html'),
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
    it('should find radio buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find iframes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('iframe');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('table');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });
  });

  describe('findElementsByAttribute - Button text search', () => {
    it('should find elements containing "Button" in text or attributes', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
    });

    it('should find elements by exact text "RadioButton 1:"', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('RadioButton 1:');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by partial text "RadioButton 1" (substring match)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('RadioButton 1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by exact text "RadioButton 2:"', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('RadioButton 2:');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find radio buttons by name attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('radioGroup1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(2);
    });

    it('should find iframes by id attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('myFrame1');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find iframes by name attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('frameName2');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });
});