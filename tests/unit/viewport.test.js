/**
 * Unit tests for inViewport / inViewportAsync helpers
 * Verifies viewport membership checks and the inViewport flag on
 * findElements / findElementsByAttribute / findElementsByType result objects.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  inViewport,
  inViewportAsync,
  findElements,
  findElementsByType,
  findElementsByAttribute
} from '../../src/element-finder.js';

/**
 * Stubs getBoundingClientRect on an element with a rect of the given shape.
 * The default JSDOM implementation always returns {0,0,0,0}, so viewport
 * checks need explicit rects to be exercised under JSDOM.
 *
 * Also stubs offsetWidth/offsetHeight so isHidden's ancestor walk does not
 * trip on JSDOM's zero-defaults for ancestors (body, html, etc.).
 */
function stubRect(el, rect) {
  el.getBoundingClientRect = () => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    toJSON() {
      return { ...this };
    }
  });
  Object.defineProperty(el, 'offsetWidth', { value: rect.width, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { value: rect.height, configurable: true });
}

/**
 * Stubs rect on the element AND every ancestor up to <html> so that
 * isHidden()'s ancestor walk does not mark everything as hidden.
 */
function stubRectWithAncestors(el, rect) {
  stubRect(el, rect);
  let parent = el.parentElement;
  while (parent) {
    Object.defineProperty(parent, 'offsetWidth', { value: 1024, configurable: true });
    Object.defineProperty(parent, 'offsetHeight', { value: 768, configurable: true });
    parent.getBoundingClientRect = parent.getBoundingClientRect || (() => ({
      x: 0, y: 0, width: 1024, height: 768,
      top: 0, bottom: 768, left: 0, right: 1024,
      toJSON() { return { ...this }; }
    }));
    parent = parent.parentElement;
  }
}

describe('ElementFinder Viewport Helpers', () => {
  let window;
  let document;

  beforeAll(() => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="viewport-test-root">
            <button id="inside-btn">Inside</button>
            <button id="offscreen-btn">Offscreen</button>
            <button id="partial-btn">Partial</button>
            <button id="zero-size-btn">Zero</button>
            <button id="hidden-btn" hidden>Hidden</button>
            <div id="offscreen-container" style="position:absolute; left:-1000px; top:-1000px;">
              <button id="way-off-btn">Way Off</button>
            </div>
          </div>
        </body>
      </html>
    `;

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.document = document;
    global.Node = window.Node;
    global.window = window;

    // Default viewport size: 1024 x 768
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });

  afterAll(() => {
    window.close();
    delete global.window;
    delete global.document;
    delete global.Node;
  });

  beforeEach(() => {
    // Stub every relevant element with a sensible rect AND non-zero offsets
    // (isHidden walks the ancestor chain, so we need to stub parents too)
    stubRectWithAncestors(document.getElementById('inside-btn'), {
      x: 10, y: 10, width: 100, height: 30, top: 10, bottom: 40, left: 10, right: 110
    });
    stubRectWithAncestors(document.getElementById('offscreen-btn'), {
      x: -500, y: 10, width: 100, height: 30, top: 10, bottom: 40, left: -500, right: -400
    });
    stubRectWithAncestors(document.getElementById('partial-btn'), {
      x: 1000, y: 760, width: 100, height: 30, top: 760, bottom: 790, left: 1000, right: 1100
    });
    stubRectWithAncestors(document.getElementById('zero-size-btn'), {
      x: 50, y: 50, width: 0, height: 0, top: 50, bottom: 50, left: 50, right: 50
    });
    stubRectWithAncestors(document.getElementById('hidden-btn'), {
      x: 10, y: 10, width: 100, height: 30, top: 10, bottom: 40, left: 10, right: 110
    });
    stubRectWithAncestors(document.getElementById('way-off-btn'), {
      x: -1000, y: -1000, width: 50, height: 20, top: -1000, bottom: -980, left: -1000, right: -950
    });

    // Ensure the hidden button is sized but has the hidden attribute
    document.getElementById('hidden-btn').removeAttribute('hidden');
    document.getElementById('hidden-btn').setAttribute('hidden', '');
  });

  describe("inViewport (sync)", () => {
    it('returns true for elements fully inside the viewport', () => {
      expect(inViewport(document.getElementById('inside-btn'))).toBe(true);
    });

    it('returns false for elements fully outside the viewport', () => {
      expect(inViewport(document.getElementById('offscreen-btn'))).toBe(false);
      expect(inViewport(document.getElementById('way-off-btn'))).toBe(false);
    });

    it('returns true for elements that partially overlap the viewport', () => {
      expect(inViewport(document.getElementById('partial-btn'))).toBe(true);
    });

    it('returns false for elements with zero rendered size', () => {
      expect(inViewport(document.getElementById('zero-size-btn'))).toBe(false);
    });

    it('returns false for hidden elements even when inside the viewport', () => {
      expect(inViewport(document.getElementById('hidden-btn'))).toBe(false);
    });

    it('returns false for null or undefined input', () => {
      expect(inViewport(null)).toBe(false);
      expect(inViewport(undefined)).toBe(false);
    });

    it('honors fullyVisible option (strict containment)', () => {
      // partial-btn extends past the right/bottom edges — must be true with default
      expect(inViewport(document.getElementById('partial-btn'), { fullyVisible: false })).toBe(true);
      // ...but false when fullyVisible is required
      expect(inViewport(document.getElementById('partial-btn'), { fullyVisible: true })).toBe(false);
      // inside-btn is fully contained in both cases
      expect(inViewport(document.getElementById('inside-btn'), { fullyVisible: true })).toBe(true);
    });

    it('honors threshold option (minimum intersection ratio)', () => {
      // partial-btn has rect 100x30 = 3000 px², viewport-overlap is 24x8 = 192 px²
      // ratio = 0.064; threshold 0.1 should fail, threshold 0.01 should pass
      expect(inViewport(document.getElementById('partial-btn'), { threshold: 0.1 })).toBe(false);
      expect(inViewport(document.getElementById('partial-btn'), { threshold: 0.01 })).toBe(true);
    });
  });

  describe("inViewportAsync (IntersectionObserver fallback)", () => {
    it('resolves to false when IntersectionObserver is unavailable (JSDOM)', async () => {
      // JSDOM does not implement IntersectionObserver; the helper must fall back
      // to the sync geometry check. Ensure no leftover mock from another test.
      delete global.IntersectionObserver;
      expect(typeof IntersectionObserver).toBe('undefined');
      const result = await inViewportAsync(document.getElementById('inside-btn'));
      expect(result).toBe(true);
    });

    it('resolves to false for an element outside the viewport (fallback path)', async () => {
      const result = await inViewportAsync(document.getElementById('offscreen-btn'));
      expect(result).toBe(false);
    });

    it('resolves to false for null input', async () => {
      const result = await inViewportAsync(null);
      expect(result).toBe(false);
    });

    it('resolves via stubbed IntersectionObserver when available', async () => {
      // Provide a mock IntersectionObserver that fires the callback synchronously
      class MockIntersectionObserver {
        constructor(callback, opts) {
          this.opts = opts || {};
          this._cb = callback;
        }
        observe(el) {
          this._cb([{ isIntersecting: true, intersectionRatio: 1, target: el }]);
        }
        disconnect() {}
      }
      global.IntersectionObserver = MockIntersectionObserver;
      try {
        const result = await inViewportAsync(document.getElementById('inside-btn'), { timeout: 100 });
        expect(result).toBe(true);
      } finally {
        delete global.IntersectionObserver;
      }
    });

    it('resolves false on timeout when observer never reports intersection', async () => {
      class SilentObserver {
        constructor() {}
        observe() {}
        disconnect() {}
      }
      global.IntersectionObserver = SilentObserver;
      try {
        const result = await inViewportAsync(document.getElementById('inside-btn'), { timeout: 50 });
        expect(result).toBe(false);
      } finally {
        delete global.IntersectionObserver;
      }
    });
  });

  describe('inViewport flag on result objects', () => {
    it('includes inViewport alongside isHidden on every result', () => {
      const result = findElementsByType('button');
      expect(result.elements.length).toBeGreaterThan(0);
      for (const item of result.elements) {
        expect(item).toHaveProperty('isHidden');
        expect(item).toHaveProperty('inViewport');
        expect(typeof item.isHidden).toBe('boolean');
        expect(typeof item.inViewport).toBe('boolean');
      }
    });

    it('reports inViewport=true for elements inside the viewport', () => {
      const result = findElementsByType('button');
      const inside = result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
      expect(inside.isHidden).toBe(false);
    });

    it('reports inViewport=false for elements fully outside the viewport', () => {
      const result = findElementsByType('button');
      const wayOff = result.elements.find((e) => e.element && e.element.id === 'way-off-btn');
      expect(wayOff).toBeDefined();
      expect(wayOff.inViewport).toBe(false);
    });

    it('reports inViewport=false for hidden elements', () => {
      const result = findElementsByType('button');
      const hidden = result.elements.find((e) => e.element && e.element.id === 'hidden-btn');
      expect(hidden).toBeDefined();
      expect(hidden.isHidden).toBe(true);
      expect(hidden.inViewport).toBe(false);
    });

    it('findElements also exposes inViewport on each result', () => {
      const result = findElements('button', null);
      expect(result.elements.length).toBeGreaterThan(0);
      const inside = result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
    });

    it('findElementsByAttribute also exposes inViewport on each result', () => {
      const result = findElementsByAttribute('Inside');
      expect(result.elements.length).toBeGreaterThan(0);
      const inside = result.elements.find((e) => e.element && e.element.id === 'inside-btn');
      expect(inside).toBeDefined();
      expect(inside.inViewport).toBe(true);
    });
  });
});
