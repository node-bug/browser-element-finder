/**
 * Test Switches Element Finder
 * Tests that switches in switches.html can be identified and highlighted
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Switches Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the switches HTML file
    const htmlPath = join(__dirname, 'fixtures', 'switches.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', 'browser-element-finder.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for page to load
    await driver.sleep(500);

    // Test 1: Find all switches (including hidden)
    console.log('--- Test 1: Find all switches ---');
    const switchDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result.elements.map(e => ({
        tagName: e.tagName,
        role: e.element.getAttribute('role'),
        type: e.element.getAttribute('type'),
        id: e.element.getAttribute('id')
      }));
    `);
    console.log(`Found ${switchDetails.length} switches (including hidden):`);
    switchDetails.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, role=${item.role}, type=${item.type}, id=${item.id}`);
    });

    // Test 2: Highlight all switches (including hidden)
    console.log('\n--- Test 2: Highlight all switches ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      const elements = result.elements.map(e => e.element);
      ElementFinder.highlight(elements, 'green', 3);
      console.log('Highlighted ' + elements.length + ' switches');
    `);
    console.log('All switches highlighted in green (including shadow DOM and iframe)');

    // Test 3: Get bounding box info for all switches
    console.log('\n--- Test 3: Switch bounding boxes ---');
    const switchInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('switch', null, false, true);
      return result.elements.map(e => ({
        tagName: e.tagName,
        id: e.element.getAttribute('id'),
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    console.log(`Bounding boxes for ${switchInfo.length} switches:`);
    switchInfo.forEach((item, i) => {
      console.log(`  [${i+1}] ${item.tagName} (${item.id}): (${item.x}, ${item.y}) ${item.width}x${item.height}`);
    });

    console.log('\n=== All Switch Tests Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);