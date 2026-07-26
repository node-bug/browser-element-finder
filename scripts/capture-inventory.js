/**
 * Captures the ElementFinder inventory from a page and saves it as JSON.
 *
 * Injects the built IIFE bundle (index.js) into a headless Chrome page,
 * runs getElementInventory(), and writes the result to the output/ folder.
 *
 * Usage:
 *   node scripts/capture-inventory.js [url]
 *
 *   url  - Page to capture (default: file:// to the demo-page fixture)
 *
 * Requires a Chrome binary on PATH (or the default macOS location).
 */
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGET_URL = process.argv[2] || join(ROOT, 'tests/fixtures/demo-page.html');
const OUTPUT_DIR = join(ROOT, 'output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'inventory.json');
const INCOGNITO = process.argv.includes('--incognito');

async function main() {
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments(
    '--headless=new',
    '--disable-infobars',
    '--disable-notifications',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  );
  chromeOptions.excludeSwitches(['enable-automation']);
  if (INCOGNITO) {
    chromeOptions.addArguments('--incognito');
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    console.log('Navigating to:', TARGET_URL);
    await driver.get(TARGET_URL);
    console.log('Page loaded:', await driver.getTitle());

    // Inject ElementFinder
    const finderPath = join(ROOT, 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    console.log('Injecting ElementFinder (code length:', finderCode.length, ')...');

    await driver.executeScript(finderCode + '\nwindow.ElementFinder = ElementFinder;');

    // Verify injection
    const hasEF = await driver.executeScript('return typeof window.ElementFinder !== "undefined"');
    if (!hasEF) {
      throw new Error('ElementFinder injection failed');
    }
    console.log('ElementFinder injected successfully');

    // Wait briefly for any dynamic content
    await driver.sleep(500);

    // Capture the inventory
    console.log('Capturing element inventory...');
    const inventory = await driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    // Create output directory and write JSON
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(inventory, null, 2), 'utf-8');

    // Cross-reference inventory elements with findProbableElements
    console.log('\n=== CROSS-REFERENCE WITH findProbableElements ===');
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    for (const group of inventory) {
      for (const invEl of group.elements) {
        const { type, description, boundingBox } = invEl;

        // Skip text-less elements (no description to search for)
        if (!description) {
          notFoundCount++;
          continue;
        }

        // Use findProbableElements to find elements matching type + description
        const found = await driver.executeScript(`
          const result = ElementFinder.findProbableElements({ type: ${JSON.stringify(type)}, text: ${JSON.stringify(description)} });
          return result.elements;
        `);

        if (found.length === 0) {
          notFoundCount++;
          continue;
        }

        // Compare dimensions of the first found element with the inventory element
        const foundEl = found[0];
        const foundWidth = foundEl.boundingBox.width;
        const foundHeight = foundEl.boundingBox.height;
        const invWidth = boundingBox.width;
        const invHeight = boundingBox.height;
        const dimensionsMatch = foundWidth === invWidth && foundHeight === invHeight;

        if (dimensionsMatch) {
          matchCount++;
        } else {
          mismatchCount++;
          console.log(
            `MISMATCH: <${type}> "${description}" — inventory: ${invWidth}x${invHeight}, found: ${foundWidth}x${foundHeight}`,
          );
        }
      }
    }

    console.log(`\nCross-reference results:`);
    console.log(`  Dimensions match: ${matchCount}`);
    console.log(`  Dimensions mismatch: ${mismatchCount}`);
    console.log(`  Not found by findProbableElements: ${notFoundCount}`);

    // Print summary
    console.log('\n=== INVENTORY SUMMARY ===');
    console.log('Total frame groups:', inventory.length);
    let totalElements = 0;
    for (const group of inventory) {
      console.log(`\nFrame ${group.frame}: ${group.elements.length} elements`);
      totalElements += group.elements.length;
      const typeCounts = {};
      for (const el of group.elements) {
        typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;
      }
      for (const [type, count] of Object.entries(typeCounts).sort()) {
        console.log(`  ${type}: ${count}`);
      }
      if (group.overlay) {
        console.log(`  Overlay: ${group.overlay.type} - "${group.overlay.description}" (index: ${group.overlay.index})`);
      }
    }
    console.log(`\nTotal elements: ${totalElements}`);
    console.log('\nFull inventory saved to:', OUTPUT_FILE);
  } finally {
    await driver.quit();
    console.log('\nBrowser closed.');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
