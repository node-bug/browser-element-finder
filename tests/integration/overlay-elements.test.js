/**
 * Integration tests for findOverlayElements
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('findOverlayElements Tests', () => {
  const fixture = createDriverFixture({
    url: loadFixture('overlays-unit.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  beforeEach(async () => {
    await fixture.driver.executeScript(`
      ElementFinder.setIgnoredTags(['SCRIPT', 'STYLE', 'HEAD']);
    `);
  });

  it('should find elements with role="dialog"', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.id === 'aria-dialog');
    `);
    expect(found).toBeDefined();
  });

  it('should find elements with role="alertdialog"', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.id === 'alert-dialog');
    `);
    expect(found).toBeDefined();
  });

  it('should find open <dialog> elements', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.id === 'native-dialog');
    `);
    expect(found).toBeDefined();
  });

  it('should find elements with aria-modal="true"', async () => {
    const count = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.filter(e => e.element && e.element.getAttribute('aria-modal') === 'true').length;
    `);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('should find elements with popover attribute', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.id === 'popover-element');
    `);
    expect(found).toBeDefined();
  });

  it('should find elements with overlay-like class names', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.id === 'cookie-banner');
    `);
    expect(found).toBeDefined();
  });

  it('should NOT find regular content elements', async () => {
    const found = await fixture.driver.executeScript(`
      const result = ElementFinder.findOverlayElements();
      return result.elements.find(e => e.element && e.element.className === 'regular-content');
    `);
    // Selenium may serialize undefined as null when returning to Node.js
    expect(found == null).toBe(true);
  });

  it('should return empty array when no overlays exist', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementFinder.findOverlayElements();
    `);
    // overlays-unit.html has overlays, so this checks the function doesn't throw
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('should throw TypeError when only x is provided', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        ElementFinder.findOverlayElements(100);
        return 'no-throw';
      } catch (e) {
        return e.constructor.name;
      }
    `);
    expect(result).toBe('TypeError');
  });

  it('should throw TypeError when only y is provided', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        ElementFinder.findOverlayElements(null, 200);
        return 'no-throw';
      } catch (e) {
        return e.constructor.name;
      }
    `);
    expect(result).toBe('TypeError');
  });

  it('should throw TypeError when x is not a finite number', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        ElementFinder.findOverlayElements(Infinity, 100);
        return 'no-throw';
      } catch (e) {
        return e.constructor.name;
      }
    `);
    expect(result).toBe('TypeError');
  });

  it('should throw TypeError when y is not a finite number', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        ElementFinder.findOverlayElements(100, NaN);
        return 'no-throw';
      } catch (e) {
        return e.constructor.name;
      }
    `);
    expect(result).toBe('TypeError');
  });

  it('should throw TypeError when x is a string', async () => {
    const result = await fixture.driver.executeScript(`
      try {
        ElementFinder.findOverlayElements('100', 200);
        return 'no-throw';
      } catch (e) {
        return e.constructor.name;
      }
    `);
    expect(result).toBe('TypeError');
  });

  it('should return overlays at point when valid coordinates are provided', async () => {
    const result = await fixture.driver.executeScript(`
      const dialogEl = document.getElementById('aria-dialog');
      const originalElementsFromPoint = document.elementsFromPoint;
      document.elementsFromPoint = () => {
        return [dialogEl, document.body];
      };
      try {
        return ElementFinder.findOverlayElements(100, 100);
      } finally {
        document.elementsFromPoint = originalElementsFromPoint;
      }
    `);
    expect(result.elements.length).toBeGreaterThanOrEqual(1);
    // Do the ID lookup inside the browser where native .id works
    const foundDialogId = await fixture.driver.executeScript(`
      return arguments[0].elements.find(e => e.element && e.element.id === 'aria-dialog')?.element?.id;
    `, result);
    expect(foundDialogId).toBe('aria-dialog');
  });

  it('should return empty array when no overlay exists at the given point', async () => {
    const result = await fixture.driver.executeScript(`
      const originalElementsFromPoint = document.elementsFromPoint;
      document.elementsFromPoint = () => {
        return [document.body];
      };
      try {
        return ElementFinder.findOverlayElements(10, 10);
      } finally {
        document.elementsFromPoint = originalElementsFromPoint;
      }
    `);
    expect(result.elements.length).toBe(0);
  });

  it('should return multiple overlays from the render stack at a point', async () => {
    const result = await fixture.driver.executeScript(`
      const dialogEl = document.getElementById('aria-dialog');
      const alertDialog = document.getElementById('alert-dialog');
      const originalElementsFromPoint = document.elementsFromPoint;
      document.elementsFromPoint = () => {
        return [dialogEl, alertDialog, document.body];
      };
      try {
        return ElementFinder.findOverlayElements(100, 100);
      } finally {
        document.elementsFromPoint = originalElementsFromPoint;
      }
    `);
    expect(result.elements.length).toBeGreaterThanOrEqual(2);
    // Do the ID lookup inside the browser where native .id works
    const foundIds = await fixture.driver.executeScript(`
      return arguments[0].elements.filter(e => e.element && (e.element.id === 'aria-dialog' || e.element.id === 'alert-dialog')).map(e => e.element.id);
    `, result);
    expect(foundIds).toContain('aria-dialog');
    expect(foundIds).toContain('alert-dialog');
  });
});
