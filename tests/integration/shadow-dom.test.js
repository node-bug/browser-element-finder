/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for shadow-dom fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Shadow DOM Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('shadow-dom.html'),
    injectFinder: true
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('findElementsByType - Basic Shadow DOM (Section 1)', () => {
    it('should find buttons in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(3);
    });

    it('should find dropdowns in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('dropdown');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(0);
    });

    it('should find links in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('link');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(0);
    });
  });

  describe('findElementsByAttribute - Basic Shadow DOM (Section 1)', () => {
    it('should find elements by id attribute in basic shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('shadow-name-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-name-input');
    });

    it('should find elements by placeholder attribute in shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Enter your name');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-name-input');
    });

    it('should find elements by visible text in shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(5);
    });

    it('should find elements by data-test-id attribute in shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('shadow-help');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const ids = await Promise.all(mainElements.map(e => e.element.getAttribute('id')));
      expect(ids).toContain('shadow-help-link');
    });
  });

  describe('findElementsByType - Multiple Shadow Hosts (Section 2)', () => {
    it('should find buttons in multiple shadow hosts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in multiple shadow hosts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('findElementsByAttribute - Multiple Shadow Hosts (Section 2)', () => {
    it('should find elements in multiple shadow hosts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(5);
    });

    it('should find elements by id in specific shadow host', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('login-user-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements by id in second shadow host', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('signup-name-input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute - Nested Shadow DOM (Section 3)', () => {
    it('should find elements in two-level nested shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Inner Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in three-level deep nested shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Level 3 Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in five-level deep nested shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Deepest Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByType - Shadow DOM in Iframe (Section 5)', () => {
    it('should find buttons in shadow DOM inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find textboxes in shadow DOM inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find checkboxes in shadow DOM inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });

    it('should find buttons in nested shadow inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBeGreaterThan(0);
    });
  });

  describe('findElementsByAttribute - Shadow DOM in Iframe (Section 5)', () => {
    it('should find elements in shadow DOM inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Shadow input in frame');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });

    it('should find buttons in shadow DOM inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Shadow Frame Button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });

    it('should find elements in nested shadow inside iframe', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Frame Inner Button');
      `);
      const iframeElements = result.elements.filter(e => !e.element && e.frameIndex !== -1);
      expect(iframeElements.length).toBe(1);
    });
  });

  describe('findElementsByType - Web Components (Section 8)', () => {
    it('should find buttons in custom button web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in custom input web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('findElementsByAttribute - Web Components (Section 8)', () => {
    it('should find elements in custom button web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Component Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in custom input web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Component Input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });

    it('should find elements in custom toggle web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Component Toggle');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElements - Combined Regular + Shadow DOM (Section 9)', () => {
    it('should find the Component Input textbox by placeholder and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements('textbox', 'Type here');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('custom-input-field');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('custom-input-field');
    });

    it('should find the Component Input textbox using findProbableElements and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Type here');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('custom-input-field');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('custom-input-field');
    });

    it('should find the Component Input textbox using findProbableElements by label text and validate first match', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements('textbox', 'Component Input');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
      const id = await mainElements[0].element.getAttribute('id');
      expect(id).toBe('custom-input-field');
      const testDataId = await mainElements[0].element.getAttribute('data-test-id');
      expect(testDataId).toBe('custom-input-field');
    });

    it('should find checkboxes in custom toggle web component', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(3);
    });
  });

  describe('findElementsByType - Combined Regular + Shadow DOM (Section 9)', () => {
    it('should find buttons in both regular and shadow DOM contexts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in both regular and shadow DOM contexts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find checkboxes in both regular and shadow DOM contexts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('checkbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(3);
    });
  });

  describe('findElementsByAttribute - Combined Regular + Shadow DOM (Section 9)', () => {
    it('should find elements in both regular and shadow DOM contexts', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Submit');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(1);
    });

    it('should find regular DOM elements separately', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('regular-btn');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByAttribute - Dynamic Shadow DOM (Section 7)', () => {
    it('should find elements in dynamically created shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Dynamic Button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBe(1);
    });
  });

  describe('findElementsByType - Dynamic Shadow DOM (Section 7)', () => {
    it('should find buttons in dynamically created shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('button');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });

    it('should find textboxes in dynamically created shadow DOM', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType('textbox');
      `);
      const mainElements = result.elements.filter(e => e.element);
      expect(mainElements.length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases', () => {
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
});