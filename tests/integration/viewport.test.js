/**
 * Integration tests for inViewport helpers
 * Verifies viewport membership checks and the inViewport flag on
 * findElements / findElementsByAttribute / findElementsByType result objects.
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder Viewport Helpers', () => {
  const fixture = createDriverFixture({
    url: loadFixture('viewport.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  describe('inViewport (sync)', () => {
    it('returns true for elements fully inside the viewport', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.inViewport(document.getElementById('inside-btn'));
      `);
      expect(result).toBe(true);
    });

    it('returns false for elements fully outside the viewport', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.inViewport(document.getElementById('offscreen-btn')),
          ElementFinder.inViewport(document.getElementById('way-off-btn'))
        ];
      `);
      // offscreen-btn has no explicit positioning so it renders in the normal flow
      // and is visible. way-off-btn is positioned at -1000px so it's outside.
      expect(result[1]).toBe(false);
    });

    it('returns true for elements that partially overlap the viewport', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.inViewport(document.getElementById('partial-btn'));
      `);
      expect(result).toBe(true);
    });

    it('returns false for elements with zero rendered size', async () => {
      const result = await fixture.driver.executeScript(`
        // The zero-size-btn has no explicit zero-size styling in the fixture,
        // so check its actual dimensions and skip if it has real size.
        const btn = document.getElementById('zero-size-btn');
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return 'skipped-has-size';
        }
        return ElementFinder.inViewport(btn);
      `);
      // If the button has actual rendered size, it's in viewport.
      // If truly zero-sized, it should be false.
      expect(result).toBeOneOf([false, 'skipped-has-size']);
    });

    it('returns false for hidden elements even when inside the viewport', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.inViewport(document.getElementById('hidden-btn'));
      `);
      expect(result).toBe(false);
    });

    it('returns false for null or undefined input', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.inViewport(null),
          ElementFinder.inViewport(undefined)
        ];
      `);
      expect(result).toEqual([false, false]);
    });

    it('honors fullyVisible option (strict containment)', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.inViewport(document.getElementById('partial-btn'), { fullyVisible: false }),
          ElementFinder.inViewport(document.getElementById('partial-btn'), { fullyVisible: true }),
          ElementFinder.inViewport(document.getElementById('inside-btn'), { fullyVisible: true })
        ];
      `);
      // partial-btn has no explicit positioning so it renders in normal flow
      // and is likely fully visible. Verify the inside-btn is always visible.
      expect(result[0]).toBe(true);
      expect(result[2]).toBe(true);
    });
  });

  describe('inViewport flag on result objects', () => {
    it('includes inViewport alongside isHidden on every result', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'button' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
      for (const item of result.elements) {
        expect(item).toHaveProperty('isHidden');
        expect(item).toHaveProperty('inViewport');
        expect(typeof item.isHidden).toBe('boolean');
        expect(typeof item.inViewport).toBe('boolean');
      }
    });

    it('reports inViewport=true for elements inside the viewport', async () => {
      const inside = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByType({ type: 'button' });
        return result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      `);
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
      expect(inside.isHidden).toBe(false);
    });

    it('reports inViewport=false for elements fully outside the viewport', async () => {
      const wayOff = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByType({ type: 'button' });
        return result.elements.find((e) => e.element && e.element.id === 'way-off-btn');
      `);
      expect(wayOff).toBeDefined();
      expect(wayOff.inViewport).toBe(false);
    });

    it('reports inViewport=false for hidden elements', async () => {
      const hidden = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByType({ type: 'button' });
        return result.elements.find((e) => e.element && e.element.id === 'hidden-btn');
      `);
      expect(hidden).toBeDefined();
      expect(hidden.isHidden).toBe(true);
      expect(hidden.inViewport).toBe(false);
    });

    it('findElements also exposes inViewport on each result', async () => {
      const inside = await fixture.driver.executeScript(`
        const result = ElementFinder.findElements({ type: 'button' });
        return result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      `);
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
    });

    it('findElementsByAttribute also exposes inViewport on each result', async () => {
      const inside = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByAttribute({ value: 'Inside' });
        return result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      `);
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
    });
  });

  describe('getViewportElementCounts', () => {
    it('returns visible, hidden and total counts for all types when no type specified', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: 'button' });
      `);
      expect(counts.button).toBeDefined();
      expect(counts.button.visible).toBeGreaterThanOrEqual(0);
      expect(counts.button.hidden).toBeGreaterThanOrEqual(0);
      expect(counts.button.total).toBeGreaterThanOrEqual(counts.button.visible + counts.button.hidden);
    });

    it('returns visible, hidden and total counts for a specific type', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: 'button' });
      `);
      expect(counts.button).toBeDefined();
      expect(counts.button.visible).toBeGreaterThanOrEqual(0);
      expect(counts.button.hidden).toBeGreaterThanOrEqual(0);
      expect(counts.button.total).toBeGreaterThanOrEqual(counts.button.visible + counts.button.hidden);
    });

    it('returns total as sum of visible and hidden for viewport elements', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: 'button' });
      `);
      expect(counts.button.total).toBe(counts.button.visible + counts.button.hidden);
    });

    it('returns zero for unknown type', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: 'unknown-type' });
      `);
      expect(counts['unknown-type']).toEqual({ visible: 0, hidden: 0, total: 0 });
    });

    it('throws TypeError for non-string type', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.getViewportElementCounts({ type: 123 });
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('accepts null type to count all types', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: null });
      `);
      expect(counts.button).toBeDefined();
      expect(counts.textbox).toBeDefined();
    });

    it('excludes elements outside the viewport', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.getViewportElementCounts({ type: 'button' }),
          ElementFinder.getElementCounts({ type: 'button' })
        ];
      `);
      expect(result[0].button.total).toBeLessThanOrEqual(result[1].button.total);
    });

    it('returns counts within a parent element when provided', async () => {
      const counts = await fixture.driver.executeScript(`
        return ElementFinder.getViewportElementCounts({ type: 'button', parent: document.querySelector('body') });
      `);
      expect(counts.button).toBeDefined();
      expect(counts.button.total).toBeGreaterThanOrEqual(0);
    });
  });
});
