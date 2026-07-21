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

    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', inViewport: false, formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Cancel', inViewport: false, formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Click Me', inViewport: false, formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter name', inViewport: false, formState: { value: '' } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter email', inViewport: false, formState: { value: '' } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'link', description: 'Home', inViewport: false, formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'link', description: 'About', inViewport: false, formState: null }));
  });

  it('should return only the parent subtree when a parent is provided', () => {
    // Build a scoped container with its own identifiable descendants, plus a
    // sibling element outside the scope that must NOT appear in the result.
    const scope = document.createElement('div');
    scope.id = 'scope';
    scope.innerHTML = `
      <button id="scope-btn">Scoped Submit</button>
      <input type="text" id="scope-input" placeholder="Scoped Input">
      <span id="scope-span">Scoped text</span>
    `;
    document.body.appendChild(scope);

    const outside = document.createElement('button');
    outside.id = 'outside-btn';
    outside.textContent = 'Outside Button';
    document.body.appendChild(outside);

    const tree = getElementInventory(scope);

    // Single frame group for the (single-frame) page.
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);

    const entries = tree[0].elements;
    // Only descendants of the scope container are returned.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Scoped Submit' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Scoped Input' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'element', description: 'Scoped text' }));

    // The element outside the scope is excluded.
    expect(entries).not.toContainEqual(expect.objectContaining({ description: 'Outside Button' }));

    // The parent container itself is excluded (it has no own text here, but
    // even if it did, it must not appear).
    expect(entries).not.toContainEqual(expect.objectContaining({ type: 'element', description: null, index: 1 }));

    document.body.removeChild(scope);
    document.body.removeChild(outside);
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
    // index field and any form-state object.
    expect(tree[0].elements).toEqual([
      { type: 'button', description: null, boundingBox: { x: 0, y: 0, width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0, midx: 0, midy: 0 }, index: 1, inViewport: false, formState: null },
      { type: 'button', description: null, boundingBox: { x: 0, y: 0, width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0, midx: 0, midy: 0 }, index: 2, inViewport: false, formState: null },
      { type: 'textbox', description: null, boundingBox: { x: 0, y: 0, width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0, midx: 0, midy: 0 }, index: 1, inViewport: false, formState: { value: '' } },
      { type: 'image', description: null, boundingBox: { x: 0, y: 0, width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0, midx: 0, midy: 0 }, index: 1, inViewport: false, formState: null },
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
        expect(entry).toHaveProperty('boundingBox');
        expect(entry).toHaveProperty('index');
        expect(entry).toHaveProperty('inViewport');
        expect(entry).toHaveProperty('formState');
        // boundingBox shape check
        expect(entry.boundingBox).toHaveProperty('x');
        expect(entry.boundingBox).toHaveProperty('y');
        expect(entry.boundingBox).toHaveProperty('width');
        expect(entry.boundingBox).toHaveProperty('height');
        expect(entry.boundingBox).toHaveProperty('top');
        expect(entry.boundingBox).toHaveProperty('bottom');
        expect(entry.boundingBox).toHaveProperty('left');
        expect(entry.boundingBox).toHaveProperty('right');
        expect(entry.boundingBox).toHaveProperty('midx');
        expect(entry.boundingBox).toHaveProperty('midy');
        expect(typeof entry.description === 'string' || entry.description === null).toBe(true);
        expect(typeof entry.index).toBe('number');
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
