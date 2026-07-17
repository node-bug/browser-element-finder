/**
 * Generates accessibility-tree baselines for the test fixtures.
 *
 * Fixtures without iframes are rendered with JSDOM (fast, no browser needed).
 * Fixtures that rely on iframe content (srcdoc / same-origin) are rendered in a
 * real Chrome browser via Selenium so the iframe frames are captured.
 *
 * Baselines are written as pretty-printed JSON into
 * tests/fixtures/accessibility-tree-baselines/ and committed to the repo so
 * future test runs can assert the tree matches the known-good output.
 *
 * Usage: node scripts/generate-a11y-baselines.js
 */

import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAccessibilityTree } from '../src/element-finder.js';
import { createDriverFixture, loadFixture } from '../tests/integration/helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const baselineDir = resolve(repoRoot, 'tests/fixtures/accessibility-tree-baselines');

mkdirSync(baselineDir, { recursive: true });

function writeBaseline(name, tree) {
  const outPath = resolve(baselineDir, name);
  writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n');
  console.log(`Wrote baseline: ${outPath} (${tree.length} frame(s))`);
}

async function jsdomBaseline(fixtureRel, outName) {
  const html = readFileSync(resolve(repoRoot, 'tests/fixtures', fixtureRel), 'utf-8');
  const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });

  global.document = dom.window.document;
  global.Node = dom.window.Node;
  global.window = dom.window;

  const tree = getAccessibilityTree(false);
  writeBaseline(outName, tree);

  dom.window.close();
  delete global.document;
  delete global.Node;
  delete global.window;
}

async function browserBaseline(fixtureRel, outName) {
  const fixture = createDriverFixture({
    url: loadFixture(fixtureRel),
    injectFinder: true,
    sleep: 300,
  });

  try {
    await fixture.setup();
    const tree = await fixture.driver.executeScript(
      'return ElementFinder.getAccessibilityTree(false);',
    );
    writeBaseline(outName, tree);
  } finally {
    await fixture.teardown();
  }
}

// All fixtures, classified by whether they require a real browser (iframes /
// shadow DOM that needs layout) or can be rendered with JSDOM.
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

const BROWSER_FIXTURES = [
  'accessibility-tree.html',
  'iframes.html',
  'radio-iframe-table.html',
  'shadow-dom.html',
  'switches.html',
];

for (const fixture of JSDOM_FIXTURES) {
  await jsdomBaseline(fixture, fixture.replace(/\.html$/, '.json'));
}

for (const fixture of BROWSER_FIXTURES) {
  await browserBaseline(fixture, fixture.replace(/\.html$/, '.json'));
}

console.log('Accessibility-tree baselines generated.');
