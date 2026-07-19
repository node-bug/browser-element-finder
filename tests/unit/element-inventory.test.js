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
    const tree = getElementInventory();
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    // The main document frame uses frameIndex -1 (consistent with getAllFrames).
    expect(tree[0].frame).toBe(-1);
    expect(Array.isArray(tree[0].elements)).toBe(true);
    expect(tree[0].elements.length).toBeGreaterThan(0);
  });

  it('should include expected identifiable elements from the main document', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;

    expect(entries).toContainEqual({ type: 'button', description: 'Submit', inViewport: false, formState: null });
    expect(entries).toContainEqual({ type: 'button', description: 'Cancel', inViewport: false, formState: null });
    expect(entries).toContainEqual({ type: 'button', description: 'Click Me', inViewport: false, formState: null });
    expect(entries).toContainEqual({ type: 'textbox', description: 'Enter name', inViewport: false, formState: { value: '' } });
    expect(entries).toContainEqual({ type: 'textbox', description: 'Enter email', inViewport: false, formState: { value: '' } });
    expect(entries).toContainEqual({ type: 'link', description: 'Home', inViewport: false, formState: null });
    expect(entries).toContainEqual({ type: 'link', description: 'About', inViewport: false, formState: null });
  });

  it('should include text-less elements (always-on) when no element has identifiable text', () => {
    const emptyPath = resolve(__dirname, '..', 'fixtures/element-inventory-empty.html');
    const emptyHtml = readFileSync(emptyPath, 'utf-8');
    const emptyDom = new JSDOM(emptyHtml, { url: 'http://localhost', pretendToBeVisual: true });

    global.window = emptyDom.window;
    global.document = emptyDom.window.document;
    global.Node = emptyDom.window.Node;

    const tree = getElementInventory();
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);
    // Text-less elements are always included, identified by their positional
    // index (#N) and any form-state object.
    expect(tree[0].elements).toEqual([
      { type: 'button', description: '#1', inViewport: false, formState: null },
      { type: 'button', description: '#2', inViewport: false, formState: null },
      { type: 'textbox', description: '#1', inViewport: false, formState: { value: '' } },
      { type: 'image', description: '#1', inViewport: false, formState: null },
    ]);

    emptyDom.window.close();
    // Restore the main window so later tests still have a valid global.
    global.window = window;
    global.document = document;
    global.Node = window.Node;
  });

  it('should format every entry as an object with a known element type', () => {
    const tree = getElementInventory();
    const validTypes = new Set(Object.keys(ELEMENT_DEFINITIONS));

    for (const group of tree) {
      for (const entry of group.elements) {
        expect(entry).toHaveProperty('type');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('inViewport');
        expect(entry).toHaveProperty('formState');
        expect(typeof entry.description).toBe('string');
        expect(typeof entry.inViewport).toBe('boolean');
        expect(validTypes.has(entry.type)).toBe(true);
      }
    }
  });

  it('should expose an inViewport boolean on every element', () => {
    const tree = getElementInventory();
    for (const group of tree) {
      for (const entry of group.elements) {
        expect(typeof entry.inViewport).toBe('boolean');
      }
    }
  });

  it('should match the committed baseline for element-types-unit.html', () => {
    const tree = getElementInventory();
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

    const tree = getElementInventory();
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

        const tree = getElementInventory();
        const baseline = loadElementInventoryBaseline(fixture.replace(/\.html$/, '.json'));
        expect(tree).toEqual(baseline);

        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.Node;
      });
    }
  });
});
