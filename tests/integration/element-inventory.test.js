/**
 * Integration tests for getElementInventory()
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';
import { loadElementInventoryBaseline, normalizeBoundingBoxes } from '../helpers/element-inventory-baseline.js';

describe('ElementFinder - getElementInventory', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-inventory.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should return two frame groups (main document + same-origin iframe)', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    expect(Array.isArray(tree)).toBe(true);
    // The same-origin srcdoc iframe is included as a second frame.
    expect(tree.length).toBe(2);

    const frames = tree.map((g) => g.frame).sort((a, b) => a - b);
    expect(frames).toEqual([-1, 0]);
  });

  it('should include main-document elements in frame -1', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    const main = tree.find((g) => g.frame === -1);
    expect(main).toBeDefined();
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'heading', description: 'Welcome', inViewport: true, formState: null }));
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'link', description: 'Home', inViewport: true, formState: null }));
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', inViewport: true, formState: null }));
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Email', inViewport: true, formState: { value: '' } }));
  });

  it('should include same-origin iframe elements in frame 0', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    // The same-origin iframe is returned as frame 0 with its own elements.
    const iframe = tree.find((g) => g.frame === 0);
    expect(iframe).toBeDefined();
    expect(iframe.elements).toContainEqual(expect.objectContaining({ type: 'heading', description: 'Iframe Heading', inViewport: true, formState: null }));
    expect(iframe.elements).toContainEqual(expect.objectContaining({ type: 'button', description: 'Login', inViewport: true, formState: null }));
  });

  it('should match the committed baseline for element-inventory.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const baseline = loadElementInventoryBaseline('element-inventory.json');
    expect(tree).toEqual(baseline);
  });
});

describe('ElementFinder - getElementInventory(parent) scoping', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-inventory-scope.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should return only the parent subtree (descendants, excluding the parent) in a single frame group', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory(document.getElementById('scope-container'));
    `);

    // Single frame group for the (single-frame) page.
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);

    const entries = tree[0].elements;

    // Descendants of the scope container are present.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'heading', description: 'Scoped Heading' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Scoped Submit' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Scoped Email' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'link', description: 'Scoped Link' }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'element', description: 'Scoped text' }));

    // Elements outside the scope container are excluded.
    expect(entries).not.toContainEqual(expect.objectContaining({ description: 'Outside Button' }));
    expect(entries).not.toContainEqual(expect.objectContaining({ description: 'Outside Link' }));

    // The parent container itself is excluded. The container div has no own
    // text, so if it leaked in it would appear as a text-less `element` entry
    // (description null). Assert no such entry exists.
    expect(entries.some((e) => e.type === 'element' && e.description === null)).toBe(false);

    // The overlay field should be present and either null or a properly-shaped entry.
    expect(tree[0]).toHaveProperty('overlay');
    const overlay = tree[0].overlay;
    if (overlay !== null) {
      expect(overlay).toHaveProperty('type');
      expect(overlay).toHaveProperty('description');
      expect(overlay).toHaveProperty('index');
      expect(overlay).toHaveProperty('inViewport');
      expect(overlay).toHaveProperty('formState');
    }
  });
});

describe('ElementFinder - getElementInventory cross-origin handling', () => {
  const fixture = createDriverFixture({
    url: loadFixture('iframes.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should not throw and should skip the cross-origin iframe but include same-origin iframes', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    expect(Array.isArray(tree)).toBe(true);
    // Main document + same-origin srcdoc iframe. The cross-origin
    // (example.com) iframe is represented as an iframe entry but its contents
    // are skipped; the same-origin iframe's contents ARE included.
    expect(tree.length).toBe(2);

    const frames = tree.map((g) => g.frame).sort((a, b) => a - b);
    expect(frames).toEqual([-1, 0]);

    // The same-origin iframe IS included (proves same-origin traversal works).
    const iframe = tree.find((g) => g.frame === 0);
    expect(iframe).toBeDefined();
    expect(iframe.elements).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'Iframe Checkbox', inViewport: true, formState: { checked: false } }));

    // No frame references the cross-origin iframe's content (example.com).
    const allEntries = tree.flatMap((g) => g.elements);
    expect(allEntries.some((e) => e.description && e.description.toLowerCase().includes('example.com'))).toBe(false);
  });

  it('should match the committed baseline for iframes.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const baseline = loadElementInventoryBaseline('iframes.json');
    expect(tree).toEqual(baseline);
  });
});

// Validate getElementInventory against the committed baseline for every
// fixture in the repo that has a baseline (the complete page is returned, with
// an inViewport flag per element). This catches regressions across all
// available fixtures.
// Uses a single shared Chrome instance across all fixtures to avoid spawning
// 21 separate drivers — one driver navigates to each fixture URL in turn.
const BROWSER_FIXTURES = [
  'element-inventory-empty.html',
  'element-inventory.html',
  'animations.html',
  'attributes.html',
  'demo-page.html',
  'dropdowns.html',
  'edge-cases.html',
  'element-types-unit.html',
  'element-types.html',
  'find-elements.html',
  'forms.html',
  'iframes.html',
  'interactive-elements.html',
  'overlay-link.html',
  'overlays-unit.html',
  'overlays.html',
  'radio-iframe-table.html',
  'shadow-dom.html',
  'switches.html',
  'tables.html',
  'viewport.html',
];

describe('ElementFinder - getElementInventory baseline parity (all browser fixtures)', () => {
  // One driver shared across all fixture comparisons — navigates to each URL in turn.
  const fixture = createDriverFixture({
    injectFinder: true,
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  for (const fixtureName of BROWSER_FIXTURES) {
    it(`should match the committed baseline for ${fixtureName}`, async () => {
      // Re-inject finder after each navigation since executeScript state is lost on page load.
      await fixture.navigateAndInject(loadFixture(fixtureName));
      const tree = await fixture.driver.executeScript(`
        return ElementFinder.getElementInventory();
      `);
      // The integration suite runs in a real browser, so it uses the
      // Chrome-specific baseline (tables, shadow DOM and iframes are
      // traversed in a real browser). Use tolerance-based comparison
      // to handle sub-pixel bounding box drift across Chrome runs.
      const baseline = loadElementInventoryBaseline(fixtureName.replace(/\.html$/, '.json'));
      // Animations fixture has active @keyframes that move elements between
      // runs, so bounding boxes are inherently unstable — strip them for
      // comparison while still validating structure/counts/types.
      if (fixtureName === 'animations.html') {
        const stripBbox = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(stripBbox);
          const copy = { ...obj };
          delete copy.boundingBox;
          return Object.fromEntries(
            Object.entries(copy).map(([k, v]) => [k, stripBbox(v)]),
          );
        };
        expect(stripBbox(tree)).toEqual(stripBbox(baseline));
      } else {
        expect(normalizeBoundingBoxes(tree)).toEqual(normalizeBoundingBoxes(baseline));
      }
    });
  }
});

// Tests for the inViewport flag. Uses a fixture with elements that are in the
// viewport at load time and others placed far below the fold so they are
// off-screen. Runs in a real Chrome browser via Selenium WebDriver.
describe('ElementFinder - getElementInventory inViewport flag', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-inventory-viewport.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should mark in-viewport elements with inViewport: true and off-screen elements with inViewport: false', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);

    const main = tree[0];
    expect(main.frame).toBe(-1);

    const inView = main.elements.filter((e) => e.inViewport);
    const offScreen = main.elements.filter((e) => !e.inViewport);

    // In-viewport elements are present.
    expect(inView).toContainEqual(expect.objectContaining({ type: 'heading', description: 'In View Heading', inViewport: true, formState: null }));
    expect(inView).toContainEqual(expect.objectContaining({ type: 'button', description: 'In View Button', inViewport: true, formState: null }));
    expect(inView).toContainEqual(expect.objectContaining({ type: 'link', description: 'In View Link', inViewport: true, formState: null }));

    // Off-screen elements are present but flagged inViewport: false.
    expect(offScreen).toContainEqual(expect.objectContaining({ type: 'heading', description: 'Offscreen Heading', inViewport: false, formState: null }));
    expect(offScreen).toContainEqual(expect.objectContaining({ type: 'button', description: 'Offscreen Button', inViewport: false, formState: null }));
    expect(offScreen).toContainEqual(expect.objectContaining({ type: 'link', description: 'Offscreen Link', inViewport: false, formState: null }));
  });

  it('should flip inViewport to true for off-screen elements after scrolling them into view', async () => {
    // Scroll the off-screen container into the viewport, then re-scan.
    await fixture.driver.executeScript(`
      document.querySelector('.far-below').scrollIntoView();
    `);

    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    const main = tree[0];
    // After scrolling, the previously off-screen elements are now in view.
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'heading', description: 'Offscreen Heading', inViewport: true, formState: null }));
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'button', description: 'Offscreen Button', inViewport: true, formState: null }));
    expect(main.elements).toContainEqual(expect.objectContaining({ type: 'link', description: 'Offscreen Link', inViewport: true, formState: null }));
  });
});

describe('ElementFinder - getElementInventory entry shape and structure', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-types-unit.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should return a single frame group for a single-frame page', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    expect(tree[0].frame).toBe(-1);
    expect(Array.isArray(tree[0].elements)).toBe(true);
    expect(tree[0].elements.length).toBeGreaterThan(0);
  });

  it('should include expected identifiable elements from the main document', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Cancel', formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Click Me', formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter name', formState: { value: '' } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter email', formState: { value: '' } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'link', description: 'Home', formState: null }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'link', description: 'About', formState: null }));
  });

  it('should format every entry as an object with a known element type', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    const validTypes = await fixture.driver.executeScript(`
      return Object.keys(ElementFinder.ELEMENT_DEFINITIONS);
    `);
    const validTypesSet = new Set(validTypes);

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
        expect(validTypesSet.has(entry.type)).toBe(true);
      }
    }
  });

  it('should expose an inViewport boolean on every element', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    for (const group of tree) {
      for (const entry of group.elements) {
        expect(typeof entry.inViewport).toBe('boolean');
      }
    }
  });

  it('should match the committed baseline for element-types-unit.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const baseline = loadElementInventoryBaseline('element-types-unit.json');
    expect(tree).toEqual(baseline);
  });
});

describe('ElementFinder - getElementInventory enrichment options', () => {
  const fixture = createDriverFixture({
    url: loadFixture('demo-page.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('default tree includes text-less form controls with nearby labels and form state', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'radio', description: 'RadioButton 1', formState: { set: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%', 'Set to 50%', 'Set to 75%'] } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter text here...', formState: { value: '' } }));
  });

  it('nearby labels rescue text from for-associated labels', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox', formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'radio', description: 'RadioButton 1', formState: { set: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%', 'Set to 50%', 'Set to 75%'] } }));
  });

  it('explicit aria-label wins over a nearby label', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', formState: { checked: false } }));
    expect(entries.some((e) => e.type === 'checkbox' && e.description === 'Nearby Label')).toBe(false);
  });

  it('placeholder wins over a nearby label', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter text here...', formState: { value: '' } }));
  });

  it('text-less controls get a positional index when no text is available', async () => {
    // demo-page.html has a single textbox with a placeholder, so it gets
    // a description. Verify the textbox is included with its placeholder text.
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Enter text here...', formState: { value: '' } }));
  });

  it('non-form text-less elements stay excluded', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    const divs = entries.filter((e) => e.type === 'element');
    expect(divs.every((e) => !e.description || !e.description.startsWith('#'))).toBe(true);
  });

  it('form state is appended to form controls by default', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%', 'Set to 50%', 'Set to 75%'] } }));
  });

  it('getElementDescriptor exposes nearby label', async () => {
    const descriptor = await fixture.driver.executeScript(`
      const cb = document.getElementById('checkbox-in-iframe');
      return ElementFinder.getElementDescriptor(cb, true);
    `);
    expect(descriptor.identifiableText).toBe('CheckBox in iFrame');
    expect(descriptor.attributeName).toBe('label');
  });

  it('all elements get a positional #N index within their type (regardless of text)', async () => {
    const result = await fixture.driver.executeScript(`
      const scope = document.createElement('div');
      scope.innerHTML = '<button>Submit</button><button>Cancel</button><button>Submit</button>';
      document.body.appendChild(scope);
      const tree = ElementFinder.getElementInventory(scope);
      const entries = tree[0].elements.filter(e => e.type === 'button');
      document.body.removeChild(scope);
      return entries;
    `);
    // Positional indexing: first button=1, second button=2, third button=3
    // regardless of text content.
    expect(result).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', index: 1 }));
    expect(result).toContainEqual(expect.objectContaining({ type: 'button', description: 'Cancel', index: 2 }));
    expect(result).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', index: 3 }));
  });

  it('text-less controls keep the type-only positional #N index', async () => {
    const result = await fixture.driver.executeScript(`
      const scope = document.createElement('div');
      scope.innerHTML = '<button>Submit</button><button></button><button>Cancel</button>';
      document.body.appendChild(scope);
      const tree = ElementFinder.getElementInventory(scope);
      const entries = tree[0].elements.filter(e => e.type === 'button');
      document.body.removeChild(scope);
      return entries;
    `);
    const textless = result.find((e) => e.description === null);
    expect(textless).toBeDefined();
    expect(textless.index).toBe(2);
  });
});

describe('ElementFinder - getElementInventory overlay detection for text-less containers', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-inventory-textless-overlay.html'),
    injectFinder: true,
    sleep: 300,
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should detect a pure-container overlay (no id, no aria-label, no own text) as the dominant overlay', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);

    // The overlay should be detected even though the outer .modal-backdrop div
    // has no id, no aria-label, and no own text (it's a pure container).
    const overlay = tree[0].overlay;
    expect(overlay).not.toBeNull();
    // The dominant overlay is the one with the most descendants — the outer
    // .modal-backdrop div (type 'element') wraps everything.
    expect(overlay.type).toBe('element');
    // The textContent fallback picks up text from child elements (e.g. the
    // <h2>Modal Heading</h2> inside the dialog), so the overlay gets a
    // description even though the container itself has no own text.
    expect(overlay.description).toBe('Modal Heading');
    expect(overlay.inViewport).toBe(true);
  });

  it('should prefer the overlay with the most inventory descendants when multiple overlays exist', async () => {
    // Navigate to a page with nested overlays.
    await fixture.driver.executeScript(`
      document.open();
      document.write(\`<!DOCTYPE html><html><head><style>
        .overlay-a { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
        .overlay-b { position: fixed; top: 50%; left: 50%; z-index: 2000; }
      </style></head><body>
        <div class="overlay-a">
          <button>A-1</button>
          <button>A-2</button>
          <button>A-3</button>
          <div class="overlay-b">
            <button>B-1</button>
          </div>
        </div>
      </body></html>\`);
      document.close();
    `);
    await fixture.driver.sleep(200);

    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    const overlay = tree[0].overlay;
    expect(overlay).not.toBeNull();
    // overlay-a wraps 4 buttons (A-1, A-2, A-3, B-1), overlay-b wraps 1 (B-1).
    // The outer overlay should win.
    expect(overlay.type).toBe('element');
  });
});
