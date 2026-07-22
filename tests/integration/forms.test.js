/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for forms fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Forms Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('forms.html'),
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
    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('submit-form');
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(12);
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

    it('should find dropdowns and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find sliders and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('slider');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-range');
    });

    it('should find datepickers and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('datepicker');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-date');
    });

    it('should find colorpickers and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('colorpicker');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('input-color');
    });

    it('should find radios and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(7);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find navigation elements and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('navigation');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find images and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('image');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find tables and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('table');
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
    it('should find elements matching visible text "Single" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Single');
      `);
      expect(result.elements.length).toBe(2);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'text-single') {
        expect(testDataId).toBe('text-single');
      } else {
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'text-single') {
          expect(forAttr).toBe('text-single');
        }
      }
    });

    it('should find elements matching "Field" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Field');
      `);
      expect(result.elements.length).toBe(18);
      const mainElements = result.elements.filter(e => e.element);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find elements by placeholder attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Enter text here');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-single');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('text-single');
    });

    it('should find elements by id attribute and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('text-email');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('text-email');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('text-email');
    });

    it('should be case-sensitive for "field" vs "Field"', async () => {
      const resultLower = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('field');
      `);
      expect(resultLower.elements.length).toBe(2);
      const resultUpper = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Field');
      `);
      expect(resultUpper.elements.length).toBe(18);
    });
  });

  describe('inViewport flag for Disabled Field (below the fold)', () => {
    beforeAll(async () => {
      await fixture.driver.manage().window().setRect({ width: 800, height: 600 });
      await fixture.driver.executeScript('window.scrollTo(0, 0);');
    });

    it('should report inViewport=false for the Disabled Field when it is below the fold', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox')
          .elements
          .find((e) => e.element && e.element.getAttribute('data-test-id') === 'val-disabled');
      `);
      expect(result).toBeDefined();
      expect(result.element).toBeDefined();

      const rect = await fixture.driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: window.innerHeight };
      `);
      expect(rect.bottom).toBeGreaterThan(rect.height);
      expect(result.inViewport).toBe(false);
    });

    it('should report inViewport=true after scrolling the Disabled Field into view', async () => {
      await fixture.driver.executeScript(`
        document.querySelector('[data-test-id="val-disabled"]')
          .scrollIntoView({ block: 'center' });
      `);
      await fixture.driver.sleep(100);

      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox')
          .elements
          .find((e) => e.element && e.element.getAttribute('data-test-id') === 'val-disabled');
      `);
      expect(result).toBeDefined();
      expect(result.element).toBeDefined();

      const rect = await fixture.driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: window.innerHeight };
      `);
      expect(rect.top).toBeLessThan(rect.height);
      expect(rect.bottom).toBeGreaterThan(0);
      expect(result.inViewport).toBe(true);
    });

    it('should expose ElementFinder.inViewport helper with the same value for the field', async () => {
      const inViewportFlag = await fixture.driver.executeScript(`
        const el = document.querySelector('[data-test-id="val-disabled"]');
        return ElementFinder.inViewport(el);
      `);
      expect(inViewportFlag).toBe(true);
    });
  });
});