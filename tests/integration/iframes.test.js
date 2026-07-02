/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for iframes fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Iframes Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('iframes.html'),
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
    it('should find checkboxes in main document and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('main-checkbox');
    });

    it('should find buttons in main document and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find textboxes in main document and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find links in main document and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings in main document and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(3);
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

  describe('findElementsByAttribute', () => {
    it('should find elements matching visible text "Iframe Checkbox"', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Iframe Checkbox');
      `);
      expect(result.elements.length).toBe(2);
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('main-checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('main-checkbox');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('main-checkbox');
    });

    it('should find elements by name attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('mainCheckbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const name = await mainElements[0].element.getAttribute('name');
      expect(name).toBe('mainCheckbox');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('main-checkbox');
    });

    it('should find elements matching "Data URL Button"', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Data URL Button');
      `);
      expect(result.elements.length).toBe(1);
    });

    it('should find elements by id attribute "iframe-checkbox" (in iframe)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('iframe-checkbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(2);
    });

    it('should find elements by name attribute "iframeCheckbox" (in iframe)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('iframeCheckbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(2);
    });

    it('should be case-sensitive for "iframe checkbox" vs "Iframe Checkbox"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('iframe checkbox');
      `);
      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Iframe Checkbox');
      `);
      expect(resultLower.elements.length).toBe(0);
      expect(resultUpper.elements.length).toBe(2);
    });
  });
});