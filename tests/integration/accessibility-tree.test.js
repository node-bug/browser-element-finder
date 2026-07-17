/**
 * Integration tests for getAccessibilityTree()
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
      return ElementFinder.getAccessibilityTree();
    `);

    expect(Array.isArray(tree)).toBe(true);
    // The same-origin srcdoc iframe is included as a second frame.
    expect(tree.length).toBe(2);

    const frames = tree.map((g) => g.frame).sort((a, b) => a - b);
    expect(frames).toEqual([-1, 0]);
  });

  it('should include main-document elements in frame -1', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree();
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
      return ElementFinder.getAccessibilityTree();
    `);

    // The same-origin iframe is returned as frame 0 with its own elements.
    const iframe = tree.find((g) => g.frame === 0);
    expect(iframe).toBeDefined();
    expect(iframe.elements).toContain('heading:Iframe Heading');
    expect(iframe.elements).toContain('button:Login');
  });

  it('should match the committed baseline for accessibility-tree.html', async () => {
    const tree = await fixture.driver.executeScript(`
      return ElementFinder.getAccessibilityTree();
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
      return ElementFinder.getAccessibilityTree();
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
      return ElementFinder.getAccessibilityTree();
    `);
    const baseline = loadA11yBaseline('iframes.json');
    expect(tree).toEqual(baseline);
  });
});

// Validate getAccessibilityTree against the committed baseline for every
// browser-rendered fixture (those relying on iframes / shadow DOM layout) so
// regressions are caught in future runs.
const BROWSER_FIXTURES = [
  'accessibility-tree.html',
  'iframes.html',
  'radio-iframe-table.html',
  'shadow-dom.html',
  'switches.html',
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
          return ElementFinder.getAccessibilityTree();
        `);
        const baseline = loadA11yBaseline(fixtureName.replace(/\.html$/, '.json'));
        expect(tree).toEqual(baseline);
      });
    });
  }
});
