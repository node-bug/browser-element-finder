/**
 * Captures the ElementFinder inventory from github.com using Selenium.
 * This script navigates to GitHub, injects the ElementFinder bundle,
 * and prints the full element inventory for review.
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments(
    '--headless',
    '--disable-infobars',
    '--disable-notifications',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  );
  chromeOptions.excludeSwitches(['enable-automation']);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    console.log('Navigating to https://github.com...');
    await driver.get('https://github.com');
    console.log('Page loaded:', await driver.getTitle());

    // Wait for the page to be ready
    await driver.sleep(3000);

    // Inject ElementFinder
    const finderPath = join(__dirname, '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    console.log('Injecting ElementFinder (code length:', finderCode.length, ')...');

    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Verify injection
    const hasEF = await driver.executeScript('return typeof window.ElementFinder !== "undefined"');
    console.log('ElementFinder injected:', hasEF);

    // Capture the inventory
    console.log('Capturing element inventory...');
    const inventory = await driver.executeScript(`
      return ElementFinder.getElementInventory();
    `);

    // Print summary
    console.log('\n=== INVENTORY SUMMARY ===');
    console.log('Total frame groups:', inventory.length);
    for (const group of inventory) {
      console.log(`\nFrame ${group.frame}: ${group.elements.length} elements`);
      // Count by type
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

    // Print full inventory as JSON
    const jsonOutput = JSON.stringify(inventory, null, 2);
    const outputPath = join(__dirname, '..', 'github-inventory.json');
    writeFileSync(outputPath, jsonOutput);
    console.log('\nFull inventory saved to:', outputPath);

    // Print the full inventory
    console.log('\n=== FULL INVENTORY ===');
    console.log(jsonOutput);

  } finally {
    await driver.quit();
    console.log('\nBrowser closed.');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
