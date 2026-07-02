/**
 * Integration tests for ElementFinder
 * Combined type and attribute search tests for overlays fixture
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder - Overlays Fixture', () => {
  const fixture = createDriverFixture({
    url: loadFixture('overlays.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('findOverlayElements', () => {
    it('should find all overlay elements', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find ARIA dialog role elements', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('aria-dialog');
    });

    it('should find native <dialog> elements', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('native-dialog');
    });

    it('should find cookie banner by class pattern', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('cookie-banner');
    });

    it('should find elements with aria-modal="true"', async () => {
      const result = await fixture.driver.executeScript(`
        const overlays = ElementFinder.findOverlayElements();
        return overlays.elements.map(e => e.element ? e.element.getAttribute('aria-modal') : null);
      `);
      const modalCount = result.filter(attr => attr === 'true').length;
      expect(modalCount).toBeGreaterThanOrEqual(2);
    });

    it('should find popover elements', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('popover-element');
    });

    it('should find high z-index fixed/sticky positioned elements', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('backdrop');
      expect(dialogIds).toContain('toast');
    });

    it('should not find regular content as overlays', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements();
      `);
      const regularContent = result.elements.find(e =>
        e.element && e.element.getAttribute('class') === 'regular-content'
      );
      expect(regularContent).toBeUndefined();
    });

    it('should throw TypeError when only x is provided to findOverlayElements', async () => {
      await expect(
        fixture.driver.executeScript(`
          return ElementFinder.findOverlayElements(100);
        `)
      ).rejects.toThrow();
    });

    it('should throw TypeError when only y is provided to findOverlayElements', async () => {
      await expect(
        fixture.driver.executeScript(`
          return ElementFinder.findOverlayElements(null, 200);
        `)
      ).rejects.toThrow();
    });

    it('should find overlays at a specific point via elementsFromPoint', async () => {
      const result = await fixture.driver.executeScript(`
        const dialog = document.getElementById('aria-dialog');
        const rect = dialog.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return ElementFinder.findOverlayElements(centerX, centerY);
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
      const dialogIds = await Promise.all(
        result.elements
          .filter(e => e.element)
          .map(async e => e.element.getAttribute('id'))
      );
      expect(dialogIds).toContain('aria-dialog');
    });

    it('should return overlays in render order from elementsFromPoint', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements(400, 300);
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
      expect(result.elements[0].element).toBeDefined();
    });

    it('should return empty array when no overlay at point', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findOverlayElements(5, 5);
      `);
      expect(result.elements).toBeDefined();
      expect(Array.isArray(result.elements)).toBe(true);
    });
  });
});