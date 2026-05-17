/**
 * Test Shadow DOM Element Finder
 * Tests that elements inside shadow DOM can be identified
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Shadow DOM Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the shadow DOM test HTML file
    const htmlPath = join(__dirname, 'fixtures', 'shadow-dom.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', 'app.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for shadow DOM to be set up (longer wait for dynamic content)
    await driver.sleep(2000);

    // Test 1: Find buttons in basic shadow DOM (just count, don't access elements)
    console.log('--- Test 1: Find buttons in basic shadow DOM ---');
    const buttonCount = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return result.elements.length;
    `);
    console.log(`Found ${buttonCount} buttons`);
    if (buttonCount < 20) {
      throw new Error(`Expected at least 20 buttons, found ${buttonCount}`);
    }

    // Test 2: Find textboxes in shadow DOM
    console.log('\n--- Test 2: Find textboxes in shadow DOM ---');
    const textboxCount = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      return result.elements.length;
    `);
    console.log(`Found ${textboxCount} textboxes`);
    if (textboxCount < 15) {
      throw new Error(`Expected at least 15 textboxes, found ${textboxCount}`);
    }

    // Test 3: Find checkboxes in shadow DOM
    console.log('\n--- Test 3: Find checkboxes in shadow DOM ---');
    const checkboxCount = await driver.executeScript(`
      const result = ElementFinder.findElement('checkbox');
      return result.elements.length;
    `);
    console.log(`Found ${checkboxCount} checkboxes`);
    if (checkboxCount < 5) {
      throw new Error(`Expected at least 5 checkboxes, found ${checkboxCount}`);
    }

    // Test 4: Find links in shadow DOM
    console.log('\n--- Test 4: Find links in shadow DOM ---');
    const linkCount = await driver.executeScript(`
      const result = ElementFinder.findElement('link');
      return result.elements.length;
    `);
    console.log(`Found ${linkCount} links`);
    if (linkCount < 3) {
      throw new Error(`Expected at least 3 links, found ${linkCount}`);
    }

    // Test 5: Find elements by text in shadow DOM
    console.log('\n--- Test 5: Find elements by text in shadow DOM ---');
    const textCount = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'Component Button');
      return result.elements.length;
    `);
    console.log(`Found ${textCount} elements with "Component Button" text`);
    if (textCount !== 1) {
      throw new Error(`Expected 1 element with "Component Button", found ${textCount}`);
    }

    // Test 6: Check bounding boxes are correct
    console.log('\n--- Test 6: Verify bounding boxes ---');
    const bboxInfo = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return result.elements.map(e => ({
        tagName: e.tagName,
        x: Math.round(e.boundingBox.x),
        y: Math.round(e.boundingBox.y),
        width: Math.round(e.boundingBox.width),
        height: Math.round(e.boundingBox.height)
      }));
    `);
    console.log(`Bounding boxes for ${bboxInfo.length} buttons:`);
    bboxInfo.forEach((item, i) => {
      console.log(`  [${i+1}] ${item.tagName}: (${item.x}, ${item.y}) ${item.width}x${item.height}`);
    });

    // Test 7: Highlight all textboxes
    console.log('\n--- Test 7: Highlight all textboxes ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      const elements = result.elements.map(e => e.element);
      ElementFinder.highlight(elements, 'blue', 2);
      console.log('Highlighted ' + elements.length + ' textboxes');
    `);
    console.log('Textboxes highlighted in blue');

    console.log('\n=== All Shadow DOM Tests Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);