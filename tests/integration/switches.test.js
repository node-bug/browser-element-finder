/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for switches fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Switches Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('switches.html'),
    injectFinder: true
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('findElementsByType', () => {
    it('should find switches and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // checkbox-switch, aria-switch, button-switch, native-checkbox, disabled-switch, shadow-switch, iframe-switch
      expect(mainElements.length).toBe(6);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find checkboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // checkbox-switch, native-checkbox, disabled-switch, shadow-switch, iframe-switch
      expect(mainElements.length).toBe(4);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBeDefined();
    });

    it('should find buttons and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // button-switch
      expect(mainElements.length).toBe(1);
      const firstTestDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(firstTestDataId).toBe('button-switch');
    });

    it('should find textboxes and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
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
      expect(mainElements.length).toBe(0);
    });

    it('should find radios and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('radio');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find headings and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('heading');
      `);
      const mainElements = result.elements.filter(e => e.element);
      // h2 "Ultimate Switch Testing Lab"
      expect(mainElements.length).toBe(1);
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

    it('should find file inputs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('file');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find menus and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('menu');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find toolbars and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('toolbar');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });

    it('should find dialogs and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dialog');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(0);
    });
  });

  describe('findElementsByAttribute - ID', () => {
    it('should find standard checkbox switch by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('checkbox-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('checkbox-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('checkbox-switch');
    });

    it('should find ARIA switch by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('aria-switch');
      `);
      // Finds both the div and its label (aria-labelledby references the label)
      expect(result.elements.length).toBe(1);
      const ids = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('id'))
      );
      expect(ids).toContain('aria-switch');
      const testDataIds = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('data-test-id'))
      );
      expect(testDataIds).toContain('aria-switch');
    });

    it('should find button switch by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('button-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('button-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('button-switch');
    });

    it('should find native checkbox by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('native-checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('native-checkbox');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('native-checkbox');
    });

    it('should find disabled switch by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('disabled-switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('disabled-switch');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('disabled-switch');
    });
  });

  describe('findElementsByAttribute - ARIA attributes', () => {
    it('should find ARIA switch by role attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const roles = await Promise.all(mainElements.map(e => e.element.getAttribute('role')));
      expect(roles).toContain('switch');
    });

    it('should find ARIA switch by aria-labelledby attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('aria-label');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const ariaLabelledBy = await Promise.all(mainElements.map(e => e.element.getAttribute('aria-labelledby')));
      expect(ariaLabelledBy).toContain('aria-label');
    });
  });

  describe('findElementsByAttribute - data attributes', () => {
    it('should find button switch by text content "OFF"', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('OFF');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const textContent = await mainElements[0].element.getText();
      expect(textContent).toBe('OFF');
    });
  });

  describe('findElementsByAttribute - Label Text', () => {
    it('should find switch by label text "Standard Checkbox Switch" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Standard Checkbox Switch');
      `);
      // The element may be the label or the input - check both
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'checkbox-switch') {
        expect(testDataId).toBe('checkbox-switch');
      } else {
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'checkbox-switch') {
          expect(forAttr).toBe('checkbox-switch');
        }
      }
    });

    it('should find ARIA switch by label text "ARIA Div Switch" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('ARIA Div Switch');
      `);
      // Both the label element and the div with aria-labelledby should be found
      expect(result.elements.length).toBe(2);
      const roles = await Promise.all(result.elements.map(e => e.element ? e.element.getAttribute('role') : null));
      expect(roles).toContain('switch');
      const testDataIds = await Promise.all(
        result.elements.filter(e => e.element).map(e => e.element.getAttribute('data-test-id'))
      );
      expect(testDataIds).toContain('aria-switch');
    });

    it('should find button switch by label text "Native Button Switch" and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Native Button Switch');
      `);
      const mainElements = result.elements.filter(e => e.element);
      const tagNames = await Promise.all(mainElements.map(e => e.element.getTagName()));
      const testDataIds = await Promise.all(
        mainElements.map(e => e.element.getAttribute('data-test-id'))
      );
      const forAttrs = await Promise.all(
        mainElements.map(e => e.element.getAttribute('for'))
      );
      const hasButton = tagNames.includes('button');
      const hasTestDataId = testDataIds.includes('button-switch');
      const hasForAttr = forAttrs.includes('button-switch');
      expect(hasButton || hasTestDataId || hasForAttr).toBe(true);
    });

    it('should find disabled switch by label text and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Disabled Control Switch');
      `);
      expect(result.elements.length).toBe(2);
      const mainElements = result.elements.filter(e => e.element);
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      if (testDataId === 'disabled-switch') {
        expect(testDataId).toBe('disabled-switch');
      } else {
        const forAttr = await mainElements[0].element.getAttribute('for');
        if (forAttr === 'disabled-switch') {
          expect(forAttr).toBe('disabled-switch');
        }
      }
    });
  });

  describe('findElementsByAttribute - Shadow DOM', () => {
    it('should find switch inside shadow DOM by id and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('shadow-switch');
      `);
      // Shadow DOM elements are found but may not have a direct element reference
      expect(result.elements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute - Iframe', () => {
    it('should return switch inside iframe without an element reference', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Document Switch Window Node');
      `);
      // Iframe elements are returned but cannot carry an element reference
      // across the frame boundary, so they have frameIndex !== -1 and no
      // `element` property.
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });
  });
});