import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  findOverlayElements,
  setIgnoredTags,
} from '../../src/element-finder.js';

describe('findOverlayElements Unit Tests', () => {
  let window;
  let document;

  beforeAll(() => {
    const fixturePath = resolve(__dirname, 'fixtures/overlays.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    document = window.document;

    Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() { return 10; },
    });
    Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() { return 10; },
    });

    global.document = document;
    global.Node = window.Node;
    global.window = window;
  });

  afterAll(() => {
    window.close();
    delete global.window;
    delete global.document;
    delete global.Node;
  });

  it('should find elements with role="dialog"', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const dialogEl = result.elements.find(e => e.element?.id === 'aria-dialog');
    expect(dialogEl).toBeDefined();
  });

  it('should find elements with role="alertdialog"', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const alertEl = result.elements.find(e => e.element?.id === 'alert-dialog');
    expect(alertEl).toBeDefined();
  });

  it('should find open <dialog> elements', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const nativeDialog = result.elements.find(e => e.element?.id === 'native-dialog');
    expect(nativeDialog).toBeDefined();
  });

  it('should find elements with aria-modal="true"', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const modalElements = result.elements.filter(e =>
      e.element && e.element.getAttribute('aria-modal') === 'true'
    );
    expect(modalElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should find elements with popover attribute', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const popoverEl = result.elements.find(e => e.element?.id === 'popover-element');
    expect(popoverEl).toBeDefined();
  });

  it('should find elements with overlay-like class names', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const bannerEl = result.elements.find(e => e.element?.id === 'cookie-banner');
    expect(bannerEl).toBeDefined();
  });

  it('should NOT find regular content elements', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    const regularContent = result.elements.find(e =>
      e.element && e.element.className === 'regular-content'
    );
    expect(regularContent).toBeUndefined();
  });

  it('should return empty array when no overlays exist', () => {
    const emptyDom = new JSDOM('<html><body><p>Hello</p></body></html>', {
      url: 'http://localhost',
    });
    const origWindow = global.window;
    const origDoc = global.document;
    global.window = emptyDom.window;
    global.document = emptyDom.window.document;

    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    expect(result.elements.length).toBe(0);

    global.window = origWindow;
    global.document = origDoc;
    emptyDom.window.close();
  });

  it('should throw TypeError when only x is provided', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    expect(() => findOverlayElements(100)).toThrow(TypeError);
    expect(() => findOverlayElements(100)).toThrow('Both x and y coordinates must be provided together');
  });

  it('should throw TypeError when only y is provided', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    expect(() => findOverlayElements(null, 200)).toThrow(TypeError);
    expect(() => findOverlayElements(null, 200)).toThrow('Both x and y coordinates must be provided together');
  });

  it('should throw TypeError when x is not a finite number', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    expect(() => findOverlayElements(Infinity, 100)).toThrow(TypeError);
    expect(() => findOverlayElements(Infinity, 100)).toThrow('x and y must be finite numbers');
  });

  it('should throw TypeError when y is not a finite number', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    expect(() => findOverlayElements(100, NaN)).toThrow(TypeError);
    expect(() => findOverlayElements(100, NaN)).toThrow('x and y must be finite numbers');
  });

  it('should throw TypeError when x is a string', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    expect(() => findOverlayElements('100', 200)).toThrow(TypeError);
  });

  it('should return overlays at point when valid coordinates are provided', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);

    // Mock elementsFromPoint to return the aria-dialog element
    const dialogEl = document.getElementById('aria-dialog');
    const originalElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = () => {
      return [dialogEl, document.body];
    };

    try {
      const result = findOverlayElements(100, 100);
      expect(result.elements.length).toBeGreaterThanOrEqual(1);
      const foundDialog = result.elements.find(e => e.element?.id === 'aria-dialog');
      expect(foundDialog).toBeDefined();
    } finally {
      document.elementsFromPoint = originalElementsFromPoint;
    }
  });

  it('should return empty array when no overlay exists at the given point', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);

    const originalElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = () => {
      return [document.body];
    };

    try {
      const result = findOverlayElements(10, 10);
      expect(result.elements.length).toBe(0);
    } finally {
      document.elementsFromPoint = originalElementsFromPoint;
    }
  });

  it('should return multiple overlays from the render stack at a point', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);

    // Use aria-dialog and alert-dialog - both have aria-modal="true" which works in JSDOM
    const dialogEl = document.getElementById('aria-dialog');
    const alertDialog = document.getElementById('alert-dialog');
    const originalElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = () => {
      return [dialogEl, alertDialog, document.body];
    };

    try {
      const result = findOverlayElements(100, 100);
      expect(result.elements.length).toBeGreaterThanOrEqual(2);
      const foundDialog = result.elements.find(e => e.element?.id === 'aria-dialog');
      const foundAlert = result.elements.find(e => e.element?.id === 'alert-dialog');
      expect(foundDialog).toBeDefined();
      expect(foundAlert).toBeDefined();
    } finally {
      document.elementsFromPoint = originalElementsFromPoint;
    }
  });

  it('should deduplicate elements in the render stack', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);

    const dialogEl = document.getElementById('aria-dialog');
    const originalElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = () => {
      return [dialogEl, dialogEl, document.body];
    };

    try {
      const result = findOverlayElements(100, 100);
      expect(result.elements.length).toBe(1);
    } finally {
      document.elementsFromPoint = originalElementsFromPoint;
    }
  });

  it('should maintain backward compatibility with no arguments', () => {
    setIgnoredTags(['SCRIPT', 'STYLE']);
    const result = findOverlayElements();
    expect(result.elements.length).toBeGreaterThan(0);
    const dialogEl = result.elements.find(e => e.element?.id === 'aria-dialog');
    expect(dialogEl).toBeDefined();
  });
});