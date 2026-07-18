/**
 * Unit tests for getElementInventory()
 * Runs in Node.js with JSDOM for fast DOM simulation (no browser automation).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getElementInventory,
  ELEMENT_DEFINITIONS,
} from '../../src/element-finder.js';
import { loadElementInventoryBaseline } from '../helpers/element-inventory-baseline.js';

describe('getElementInventory Unit Tests', () => {
  let window;
  let document;

  beforeAll(() => {
    const fixturePath = resolve(__dirname, '..', 'fixtures/element-types-unit.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    document = window.document;

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

  it('should return a single frame group for a single-frame page', () => {
    const tree = getElementInventory(false);
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    // The main document frame uses frameIndex -1 (consistent with getAllFrames).
    expect(tree[0].frame).toBe(-1);
    expect(Array.isArray(tree[0].elements)).toBe(true);
    expect(tree[0].elements.length).toBeGreaterThan(0);
  });

  it('should include expected identifiable elements from the main document', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;

    expect(entries).toContain('button:Submit');
    expect(entries).toContain('button:Cancel');
    expect(entries).toContain('button:Click Me');
    expect(entries).toContain('textbox:Enter name {value:""}');
    expect(entries).toContain('textbox:Enter email {value:""}');
    expect(entries).toContain('link:Home');
    expect(entries).toContain('link:About');
  });

  it('should include text-less elements (always-on) when no element has identifiable text', () => {
    const emptyPath = resolve(__dirname, '..', 'fixtures/element-inventory-empty.html');
    const emptyHtml = readFileSync(emptyPath, 'utf-8');
    const emptyDom = new JSDOM(emptyHtml, { url: 'http://localhost', pretendToBeVisual: true });

    global.window = emptyDom.window;
    global.document = emptyDom.window.document;
    global.Node = emptyDom.window.Node;

    const tree = getElementInventory(false);
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);
    // Text-less elements are always included, identified by their positional
    // index (#N) and any form-state suffix.
    expect(tree[0].elements).toEqual([
      'button:#1',
      'button:#2',
      'textbox:#1 {value:""}',
      'image:#1',
    ]);

    emptyDom.window.close();
    // Restore the main window so later tests still have a valid global.
    global.window = window;
    global.document = document;
    global.Node = window.Node;
  });

  it('should format every entry as type:text with a known element type', () => {
    const tree = getElementInventory(false);
    const validTypes = new Set(Object.keys(ELEMENT_DEFINITIONS));
    const pattern = /^([a-zA-Z0-9-]+):.+$/;

    for (const group of tree) {
      for (const entry of group.elements) {
        const match = pattern.exec(entry);
        expect(match).not.toBeNull();
        const type = match[1];
        expect(validTypes.has(type)).toBe(true);
      }
    }
  });

  it('should match the committed baseline for element-types-unit.html', () => {
    const tree = getElementInventory(false);
    const baseline = loadElementInventoryBaseline('element-types-unit.json');
    expect(tree).toEqual(baseline);
  });

  it('should match the committed baseline for element-inventory-empty.html', () => {
    const emptyPath = resolve(__dirname, '..', 'fixtures/element-inventory-empty.html');
    const emptyHtml = readFileSync(emptyPath, 'utf-8');
    const emptyDom = new JSDOM(emptyHtml, { url: 'http://localhost', pretendToBeVisual: true });

    global.window = emptyDom.window;
    global.document = emptyDom.window.document;
    global.Node = emptyDom.window.Node;

    const tree = getElementInventory(false);
    const baseline = loadElementInventoryBaseline('element-inventory-empty.json');
    expect(tree).toEqual(baseline);

    emptyDom.window.close();
    // Restore the main window so later tests still have a valid global.
    global.window = window;
    global.document = document;
    global.Node = window.Node;
  });

  // Validate getElementInventory against the committed baseline for every
  // JSDOM-renderable fixture so regressions are caught in future runs.
  const JSDOM_FIXTURES = [
    'element-inventory-empty.html',
    'animations.html',
    'attributes.html',
    'demo-page.html',
    'dropdowns.html',
    'edge-cases.html',
    'element-types-unit.html',
    'element-types.html',
    'find-elements.html',
    'forms.html',
    'interactive-elements.html',
    'overlay-link.html',
    'overlays-unit.html',
    'overlays.html',
    'tables.html',
    'viewport.html',
  ];

  describe('baseline parity for all JSDOM fixtures', () => {
    for (const fixture of JSDOM_FIXTURES) {
      it(`should match the committed baseline for ${fixture}`, () => {
        const fixturePath = resolve(__dirname, '..', 'fixtures', fixture);
        const html = readFileSync(fixturePath, 'utf-8');
        const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });

        global.window = dom.window;
        global.document = dom.window.document;
        global.Node = dom.window.Node;

        const tree = getElementInventory(false);
        const baseline = loadElementInventoryBaseline(fixture.replace(/\.html$/, '.json'));
        expect(tree).toEqual(baseline);

        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.Node;
      });
    }
  });

  describe('viewportOnly parameter', () => {
    beforeAll(() => {
      // The baseline-parity loop above deletes global.window after each fixture.
      // Restore the main window so these tests have a valid global to scan.
      global.window = window;
      global.document = document;
      global.Node = window.Node;
    });

    it('should default to viewport-only scanning (viewportOnly = true)', () => {
      // viewportOnly defaults to true, so only in-viewport elements are
      // returned. JSDOM has no layout engine, so nothing is in the viewport
      // and the tree is empty by default.
      const treeDefault = getElementInventory();
      const treeViewportOnly = getElementInventory(true);

      expect(treeDefault).toEqual([{ frame: -1, elements: [] }]);
      expect(treeViewportOnly).toEqual(treeDefault);
    });

    it('should accept a boolean viewportOnly argument', () => {
      // Passing false returns the full page (JSDOM has no layout engine, so
      // every element is treated as off-screen unless viewportOnly is false).
      const treeFull = getElementInventory(false);
      const treeViewportOnly = getElementInventory(true);
      expect(treeFull[0].elements.length).toBeGreaterThan(0);
      expect(treeViewportOnly).toEqual([{ frame: -1, elements: [] }]);
    });

    it('should return only in-viewport elements when viewportOnly is true', () => {
      const tree = getElementInventory(true);
      expect(tree).toEqual([{ frame: -1, elements: [] }]);
    });
  });
});
