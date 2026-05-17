/**
 * Test Dropdowns Element Finder
 * Tests that dropdowns in dropdowns.html can be identified and highlighted
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Dropdowns Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the dropdowns HTML file
    const htmlPath = join(__dirname, 'fixtures', 'dropdowns.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for page to load
    await driver.sleep(500);

    // Test 1: Find all dropdowns
    console.log('--- Test 1: Find all dropdowns ---');
    const dropdownDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        className: e.element.getAttribute('class'),
        role: e.element.getAttribute('role')
      }));
    `);
    console.log(`Found ${dropdownDetails.length} dropdowns:`);
    dropdownDetails.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, id=${item.id}, class=${item.className}, role=${item.role}`);
    });
    
    // Assertion: Should find exactly 5 dropdowns
    if (dropdownDetails.length !== 5) {
      throw new Error(`Expected 5 dropdowns, found ${dropdownDetails.length}`);
    }

    // Test 2: Highlight all dropdowns
    console.log('\n--- Test 2: Highlight all dropdowns ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      const elements = result.elements.map(e => e.element);
      ElementFinder.highlight(elements, 'blue', 3);
      console.log('Highlighted ' + elements.length + ' dropdowns');
    `);
    console.log('All dropdowns highlighted in blue');

    // Test 3: Get bounding box info
    console.log('\n--- Test 3: Dropdown bounding boxes ---');
    const dropdownInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    console.log(`Bounding boxes for ${dropdownInfo.length} dropdowns:`);
    dropdownInfo.forEach((item, i) => {
      console.log(`  [${i+1}] ${item.tagName} (${item.id}): (${item.x}, ${item.y}) ${item.width}x${item.height}`);
    });

    console.log('\n=== All Dropdown Tests Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);