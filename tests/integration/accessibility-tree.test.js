/**
 * Integration tests for getAccessibilityTree(viewportOnly)
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';
import { loadA11yBaseline } from '../helpers/a11y-baseline.js';

describe('ElementFinder - getAccessibilityTree', () => {
  const fixture = createDriverFixture({
    url: loadFixture('accessibility-tree.html'),
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
      return ElementFinder.getAccessibilityTree(false);
    `);

    expect(Array.isArray(tree)).toBe(true);
    // The same-origin srcdoc iframe is included as a second frame.
    expect(tree.length).toBe(2);

    const frames = tree.map((g) => g.frame).sort((a, b) => a - b);
    expect(frames).toEqual([-1, 0]);
  });

  it('should include main-document elements in frame -1', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(false);
    `);

    const main = tree.find((g) => g.frame === -1);
    expect(main).toBeDefined();
    expect(main.elements).toContain('heading:Welcome');
    expect(main.elements).toContain('link:Home');
    expect(main.elements).toContain('button:Submit');
    expect(main.elements).toContain('textbox:Email');
  });

  it('should include same-origin iframe elements in frame 0', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(false);
    `);

    // The same-origin iframe is returned as frame 0 with its own elements.
    const iframe = tree.find((g) => g.frame === 0);
    expect(iframe).toBeDefined();
    expect(iframe.elements).toContain('heading:Iframe Heading');
    expect(iframe.elements).toContain('button:Login');
  });

  it('should match the committed baseline for accessibility-tree.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(false);
    `);
    const baseline = loadA11yBaseline('accessibility-tree.json');
    expect(tree).toEqual(baseline);
  });
});

describe('ElementFinder - getAccessibilityTree cross-origin handling', () => {
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
      return ElementFinder.getAccessibilityTree(false);
    `);

    expect(Array.isArray(tree)).toBe(true);
    // Main document + same-origin srcdoc iframe. The cross-origin
    // (example.com) iframe is skipped; the same-origin iframe is included.
    expect(tree.length).toBe(2);

    const frames = tree.map((g) => g.frame).sort((a, b) => a - b);
    expect(frames).toEqual([-1, 0]);

    // The same-origin iframe IS included (proves same-origin traversal works).
    const iframe = tree.find((g) => g.frame === 0);
    expect(iframe).toBeDefined();
    expect(iframe.elements).toContain('checkbox:iframeCheckbox');

    // No frame references the cross-origin iframe's content (example.com).
    const allEntries = tree.flatMap((g) => g.elements);
    expect(allEntries.some((e) => e.toLowerCase().includes('example.com'))).toBe(false);
  });

  it('should match the committed baseline for iframes.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(false);
    `);
    const baseline = loadA11yBaseline('iframes.json');
    expect(tree).toEqual(baseline);
  });
});

// Validate getAccessibilityTree against the committed baseline for every
// fixture in the repo that has a baseline (viewportOnly = false returns the
// complete page). This catches regressions across all available fixtures.
const BROWSER_FIXTURES = [
  'accessibility-tree-empty.html',
  'accessibility-tree.html',
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

describe('ElementFinder - getAccessibilityTree baseline parity (all browser fixtures)', () => {
  for (const fixtureName of BROWSER_FIXTURES) {
    describe(fixtureName, () => {
      const fixture = createDriverFixture({
        url: loadFixture(fixtureName),
        injectFinder: true,
        sleep: 300,
      });

      beforeAll(async () => {
        await fixture.setup();
      });

      afterAll(async () => {
        await fixture.teardown();
      });

      it(`should match the committed baseline for ${fixtureName}`, async () => {
        const tree = await fixture.driver.executeScript(`
          return ElementFinder.getAccessibilityTree(false);
        `);
        const baseline = loadA11yBaseline(fixtureName.replace(/\.html$/, '.json'));
        expect(tree).toEqual(baseline);
      });
    });
  }
});

// Tests for the viewportOnly parameter. Uses a fixture with elements that are
// in the viewport at load time and others placed far below the fold so they
// are off-screen. Runs in a real Chrome browser via Selenium WebDriver.
describe('ElementFinder - getAccessibilityTree viewportOnly parameter', () => {
  const fixture = createDriverFixture({
    url: loadFixture('accessibility-tree-viewport.html'),
    injectFinder: true,
    sleep: 300
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  it('should return only in-viewport elements when viewportOnly is true (default)', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(true);
    `);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);

    const main = tree[0];
    expect(main.frame).toBe(-1);

    // In-viewport elements are present.
    expect(main.elements).toContain('heading:In View Heading');
    expect(main.elements).toContain('button:In View Button');
    expect(main.elements).toContain('link:In View Link');

    // Off-screen elements are excluded.
    expect(main.elements).not.toContain('heading:Offscreen Heading');
    expect(main.elements).not.toContain('button:Offscreen Button');
    expect(main.elements).not.toContain('link:Offscreen Link');
  });

  it('should return the complete page when viewportOnly is false', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(false);
    `);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);

    const main = tree[0];
    expect(main.frame).toBe(-1);

    // Both in-viewport and off-screen elements are present.
    expect(main.elements).toContain('heading:In View Heading');
    expect(main.elements).toContain('button:In View Button');
    expect(main.elements).toContain('link:In View Link');
    expect(main.elements).toContain('heading:Offscreen Heading');
    expect(main.elements).toContain('button:Offscreen Button');
    expect(main.elements).toContain('link:Offscreen Link');
  });

  it('should include off-screen elements after scrolling them into view (viewportOnly true)', async () => {
    // Scroll the off-screen container into the viewport, then re-scan.
    await fixture.driver.executeScript(`
      document.querySelector('.far-below').scrollIntoView();
    `);

    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree(true);
    `);

    const main = tree[0];
    // After scrolling, the previously off-screen elements are now in view.
    expect(main.elements).toContain('heading:Offscreen Heading');
    expect(main.elements).toContain('button:Offscreen Button');
    expect(main.elements).toContain('link:Offscreen Link');
  });
});
