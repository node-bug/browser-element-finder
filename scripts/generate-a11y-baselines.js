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

  const tree = getAccessibilityTree(dom.window);
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
      'return ElementFinder.getAccessibilityTree();',
    );
    writeBaseline(outName, tree);
  } finally {
    await fixture.teardown();
  }
}

await jsdomBaseline('element-types-unit.html', 'element-types-unit.json');
await jsdomBaseline('accessibility-tree-empty.html', 'accessibility-tree-empty.json');
await browserBaseline('accessibility-tree.html', 'accessibility-tree.json');
await browserBaseline('iframes.html', 'iframes.json');

console.log('Accessibility-tree baselines generated.');
