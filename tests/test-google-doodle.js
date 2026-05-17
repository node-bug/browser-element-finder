/**
 * Test Google Doodle Element Finder
 * Tests finding and highlighting elements by text on Google Doodle page
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Google Doodle Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Navigate to Google Doodle page
    await driver.get('https://doodles.google/doodle/122nd-birthday-of-charlie-chaplin/');

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for page to load
    await driver.sleep(2000);

    // Test 1: Find element with text "This Doodle celebrates"
    console.log('--- Test 1: Find element with text "Doodle" ---');
    const elementDetails = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Doodle');
      if (result.elements.length === 0) {
        return { found: false };
      }
      return {
        found: true,
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.substring(0, 100),
          x: Math.round(e.boundingBox.x),
          y: Math.round(e.boundingBox.y),
          width: Math.round(e.boundingBox.width),
          height: Math.round(e.boundingBox.height)
        }))
      };
    `);

    if (elementDetails.found) {
      console.log(`Found ${elementDetails.count} element(s) with text "Doodle":`);
      elementDetails.elements.forEach((item, i) => {
        console.log(`  [${i+1}] ${item.tagName}: "${item.text}..." at (${item.x}, ${item.y}) ${item.width}x${item.height}`);
      });
    } else {
      console.log('No elements found with that text');
    }
    
    // Assertion: Should find at least 1 element with "Doodle" text
    if (!elementDetails.found || elementDetails.count === 0) {
      throw new Error('Expected to find at least 1 element with "Doodle" text');
    }

    // Test 2: Highlight the element
    console.log('\n--- Test 2: Highlight the element ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Doodle');
      if (result.elements.length > 0) {
        const elements = result.elements.map(e => e.element);
        ElementFinder.highlight(elements, 'orange', 3);
        console.log('Highlighted ' + elements.length + ' element(s)');
      } else {
        console.log('No elements to highlight');
      }
    `);
    console.log('Element(s) highlighted in orange');

    console.log('\n=== Google Doodle Test Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);