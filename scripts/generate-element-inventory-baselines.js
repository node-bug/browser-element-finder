/**
 * Regenerates the committed element-inventory baselines used by the
 * integration (real Chrome) test suite.
 *
 * The committed `*.json` baselines are generated from real Chrome via Selenium.
 * Each fixture gets a single baseline file (`<name>.json`).
 *
 * Usage:
 *   node scripts/generate-element-inventory-baselines.js
 *
 * Requires a Chrome binary on PATH (or the default macOS location).
 */

import { writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createDriverFixture, loadFixture } from '../tests/integration/helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baselineDir = resolve(__dirname, '..', 'tests', 'fixtures', 'element-inventory-baselines');

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

// Every fixture gets a real-browser baseline (`<name>.json`) generated from
// Chrome via Selenium. The integration suite uses these baselines.

function writeBaseline(name, tree) {
  const outPath = join(baselineDir, name);
  writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n', 'utf-8');
  console.log(`✓ wrote ${name} (${tree.length} frame(s))`);
}

async function main() {
  // Chrome baselines (*.json) for every fixture — used by the integration
  // suite, which runs in a real browser.
  for (const fixtureName of FIXTURES) {
    const fixture = createDriverFixture({
      url: loadFixture(fixtureName),
      injectFinder: true,
      sleep: 300,
    });
    try {
      await fixture.setup();
      const tree = await fixture.driver.executeScript(`
        return ElementFinder.getElementInventory();
      `);
      writeBaseline(fixtureName.replace(/\.html$/, '.json'), tree);
    } catch (err) {
      console.error(`✗ failed ${fixtureName} (chrome):`, err.message);
      process.exitCode = 1;
    } finally {
      await fixture.teardown();
    }
  }
}

main();
