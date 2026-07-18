/**
 * Regenerates the committed element-inventory baselines used by the unit
 * (JSDOM) and integration (real Chrome) test suites.
 *
 * The committed `*.json` baselines are generated from JSDOM, which is the
 * deterministic source of truth for the unit suite. A real Chrome browser is
 * also used to generate `*.chrome.json` baselines for the small set of fixtures
 * that render differently in a real browser (tables and shadow DOM are
 * traversed more completely by Chrome's layout engine). The integration suite
 * loads the `.chrome.json` variant for those fixtures and the JSDOM variant for
 * everything else.
 *
 * Usage:
 *   node scripts/generate-element-inventory-baselines.js
 *
 * Requires a Chrome binary on PATH (or the default macOS location).
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { getElementInventory } from '../src/element-finder.js';
import { createDriverFixture, loadFixture } from '../tests/integration/helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baselineDir = resolve(__dirname, '..', 'tests', 'fixtures', 'element-inventory-baselines');
const fixturesDir = resolve(__dirname, '..', 'tests', 'fixtures');

// Fixtures that have a committed baseline.
const FIXTURES = [
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
  'element-inventory.html',
];

// Every fixture gets a real-browser baseline (`<name>.chrome.json`) because
// Chrome's layout/traversal (tables, shadow DOM, iframes) differs from JSDOM.
// The unit suite uses the JSDOM `*.json` baselines; the integration suite uses
// the `*.chrome.json` baselines.

function writeBaseline(name, tree) {
  const outPath = join(baselineDir, name);
  writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n', 'utf-8');
  console.log(`✓ wrote ${name} (${tree.length} frame(s))`);
}

async function main() {
  // 1. JSDOM baselines (committed *.json) — source of truth for the unit suite.
  for (const fixtureName of FIXTURES) {
    const html = readFileSync(join(fixturesDir, fixtureName), 'utf-8');
    const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    const tree = getElementInventory(false);
    writeBaseline(fixtureName.replace(/\.html$/, '.json'), tree);
    dom.window.close();
  }

  // 2. Chrome baselines (*.chrome.json) for every fixture — used by the
  //    integration suite, which runs in a real browser.
  for (const fixtureName of FIXTURES) {
    const fixture = createDriverFixture({
      url: loadFixture(fixtureName),
      injectFinder: true,
      sleep: 300,
    });
    try {
      await fixture.setup();
      const tree = await fixture.driver.executeScript(`
        return ElementFinder.getElementInventory(false);
      `);
      writeBaseline(fixtureName.replace(/\.html$/, '.chrome.json'), tree);
    } catch (err) {
      console.error(`✗ failed ${fixtureName} (chrome):`, err.message);
      process.exitCode = 1;
    } finally {
      await fixture.teardown();
    }
  }
}

main();
