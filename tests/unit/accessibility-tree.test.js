/**
 * Unit tests for getAccessibilityTree()
 * Runs in Node.js with JSDOM for fast DOM simulation (no browser automation).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getAccessibilityTree,
  ELEMENT_DEFINITIONS,
} from '../../src/element-finder.js';
import { loadA11yBaseline } from '../helpers/a11y-baseline.js';

describe('getAccessibilityTree Unit Tests', () => {
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
    const tree = getAccessibilityTree(window);
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    // The main document frame uses frameIndex -1 (consistent with getAllFrames).
    expect(tree[0].frame).toBe(-1);
    expect(Array.isArray(tree[0].elements)).toBe(true);
    expect(tree[0].elements.length).toBeGreaterThan(0);
  });

  it('should include expected identifiable elements from the main document', () => {
    const tree = getAccessibilityTree(window);
    const entries = tree[0].elements;

    expect(entries).toContain('button:Submit');
    expect(entries).toContain('button:Cancel');
    expect(entries).toContain('button:Click Me');
    expect(entries).toContain('textbox:Enter name');
    expect(entries).toContain('textbox:Enter email');
    expect(entries).toContain('link:Home');
    expect(entries).toContain('link:About');
  });

  it('should return an empty elements array when no element has identifiable text', () => {
    const emptyPath = resolve(__dirname, '..', 'fixtures/accessibility-tree-empty.html');
    const emptyHtml = readFileSync(emptyPath, 'utf-8');
    const emptyDom = new JSDOM(emptyHtml, { url: 'http://localhost', pretendToBeVisual: true });

    const tree = getAccessibilityTree(emptyDom.window);
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);
    expect(tree[0].elements).toEqual([]);

    emptyDom.window.close();
  });

  it('should format every entry as type:text with a known element type', () => {
    const tree = getAccessibilityTree(window);
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
    const tree = getAccessibilityTree(window);
    const baseline = loadA11yBaseline('element-types-unit.json');
    expect(tree).toEqual(baseline);
  });

  it('should match the committed baseline for accessibility-tree-empty.html', () => {
    const emptyPath = resolve(__dirname, '..', 'fixtures/accessibility-tree-empty.html');
    const emptyHtml = readFileSync(emptyPath, 'utf-8');
    const emptyDom = new JSDOM(emptyHtml, { url: 'http://localhost', pretendToBeVisual: true });

    const tree = getAccessibilityTree(emptyDom.window);
    const baseline = loadA11yBaseline('accessibility-tree-empty.json');
    expect(tree).toEqual(baseline);

    emptyDom.window.close();
  });

  // Validate getAccessibilityTree against the committed baseline for every
  // JSDOM-renderable fixture so regressions are caught in future runs.
  const JSDOM_FIXTURES = [
    'accessibility-tree-empty.html',
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

        const tree = getAccessibilityTree(dom.window);
        const baseline = loadA11yBaseline(fixture.replace(/\.html$/, '.json'));
        expect(tree).toEqual(baseline);

        dom.window.close();
      });
    }
  });
});
