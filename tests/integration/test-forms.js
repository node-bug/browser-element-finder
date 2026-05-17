/**
 * Test Forms Element Finder
 * Tests that form elements in forms.html can be identified and highlighted
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Forms Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the forms HTML file
    const htmlPath = join(__dirname, 'fixtures', 'forms.html');
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

    // Wait for page to load
    await driver.sleep(500);

    // Test 1: Find all textboxes
    console.log('--- Test 1: Find all textboxes ---');
    const textboxDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id,
          placeholder: e.element.getAttribute('placeholder')
        }))
      };
    `);
    console.log(`Found ${textboxDetails.count} textboxes`);
    textboxDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id} (placeholder: ${e.placeholder})`);
    });
    
    if (textboxDetails.count < 8) {
      throw new Error(`Expected at least 8 textboxes, found ${textboxDetails.count}`);
    }

    // Test 2: Find all checkboxes
    console.log('\n--- Test 2: Find all checkboxes ---');
    const checkboxDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('checkbox');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${checkboxDetails.count} checkboxes`);
    checkboxDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    // Note: Hidden checkbox (check-hidden) is correctly excluded by visibility filter
    if (checkboxDetails.count < 3) {
      throw new Error(`Expected at least 3 checkboxes, found ${checkboxDetails.count}`);
    }

    // Test 3: Find all radio buttons
    console.log('\n--- Test 3: Find all radio buttons ---');
    const radioDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('radio');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${radioDetails.count} radio buttons`);
    radioDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (radioDetails.count < 3) {
      throw new Error(`Expected at least 3 radio buttons, found ${radioDetails.count}`);
    }

    // Test 4: Find textboxes by placeholder text
    console.log('\n--- Test 4: Find textbox by placeholder text ---');
    const placeholderResult = await driver.executeScript(`
      const result = ElementFinder.findElement('textbox', 'Enter text here');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          id: e.element.id,
          placeholder: e.element.getAttribute('placeholder')
        }))
      };
    `);
    console.log(`Found ${placeholderResult.count} textbox with placeholder "Enter text here"`);
    
    if (placeholderResult.count !== 1) {
      throw new Error(`Expected 1 textbox with placeholder, found ${placeholderResult.count}`);
    }

    // Test 5: Highlight found elements
    console.log('\n--- Test 5: Highlight elements ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      ElementFinder.highlight(result.elements);
    `);
    console.log('Highlighted all textboxes');
    await driver.sleep(500);

    // Test 6: Unhighlight elements
    console.log('\n--- Test 6: Unhighlight elements ---');
    await driver.executeScript(`
      const result = ElementFinder.findElement('textbox');
      ElementFinder.unhighlight(result.elements);
    `);
    console.log('Unhighlighted all textboxes');

    console.log('\n=== All Tests Passed ===');

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);