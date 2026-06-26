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
});