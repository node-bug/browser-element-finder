/**
 * Selenium Test Script for Element Finder
 * 
 * This script demonstrates how to use the browser-element-finder.js
 * with Selenium WebDriver to find elements on a page.
 * 
 * Usage: node test-element-finder-node.js
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Element Finder Selenium Test ===\n');

  // Configure Chrome options
  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  // Build driver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the test HTML file
    // const htmlPath = join(__dirname, 'test-element-finder.html');
    // const htmlContent = readFileSync(htmlPath, 'utf8');
    // const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    const fileUrl = 'https://seleniumbase.io/demo_page';
    await driver.get(fileUrl);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, 'browser-element-finder.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    // Execute the script to define ElementFinder globally
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Test 1: Find all buttons
    console.log('--- Test 1: Find all buttons ---');
    const buttons = await driver.executeScript(`
      return ElementFinder.findElement('button');
    `);
    console.log(`Found ${buttons.elements.length} buttons`);
    buttons.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 2: Find textboxes with placeholder
    console.log('\n--- Test 2: Find textboxes ---');
    const textboxes = await driver.executeScript(`
      return ElementFinder.findElement('textbox');
    `);
    console.log(`Found ${textboxes.elements.length} textboxes`);
    textboxes.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 3: Find by text content
    console.log('\n--- Test 3: Find buttons with "Submit" text ---');
    const submitButtons = await driver.executeScript(`
      return ElementFinder.findElement('button', 'Submit');
    `);
    console.log(`Found ${submitButtons.elements.length} matching buttons`);
    submitButtons.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}`);
    });

    // Test 4: Find links
    console.log('\n--- Test 4: Find all links ---');
    const links = await driver.executeScript(`
      return ElementFinder.findElement('link');
    `);
    console.log(`Found ${links.elements.length} links`);
    links.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 5: Find checkboxes
    console.log('\n--- Test 5: Find all checkboxes ---');
    const checkboxes = await driver.executeScript(`
      return ElementFinder.findElement('checkbox');
    `);
    console.log(`Found ${checkboxes.elements.length} checkboxes`);
    checkboxes.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 6: Find dropdowns
    console.log('\n--- Test 6: Find all dropdowns ---');
    const dropdowns = await driver.executeScript(`
      return ElementFinder.findElement('dropdown');
    `);
    console.log(`Found ${dropdowns.elements.length} dropdowns`);
    dropdowns.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 7: Find tables
    console.log('\n--- Test 7: Find all tables ---');
    const tables = await driver.executeScript(`
      return ElementFinder.findElement('table');
    `);
    console.log(`Found ${tables.elements.length} tables`);
    tables.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 8: Get valid types
    console.log('\n--- Test 8: Valid element types ---');
    const types = await driver.executeScript(`
      return ElementFinder.getValidTypes();
    `);
    console.log(`Available types: ${types.join(', ')}`);

    // Test 9: Interact with returned WebElement
    console.log('\n--- Test 9: Click button using returned WebElement ---');
    const buttonResult = await driver.executeScript(`
      return ElementFinder.findElement('button', 'Click Me');
    `);
    if (buttonResult.elements.length > 0) {
      const buttonItem = buttonResult.elements[0];
      const buttonElement = buttonItem.element;
      // WebElement properties are accessed via Selenium methods
      const tagName = await buttonElement.getTagName();
      console.log(`Found button: ${tagName}`);
      // Selenium can interact with the returned WebElement
      await buttonElement.click();
      console.log('Successfully clicked the button using returned WebElement!');
    }

    // Test 10: Custom searchable attributes
    console.log('\n--- Test 10: Custom searchable attributes ---');
    const originalAttrs = await driver.executeScript(`
      return ElementFinder.getSearchableAttributes();
    `);
    console.log(`Original attributes: ${originalAttrs.join(', ')}`);
    
    await driver.executeScript(`
      ElementFinder.setSearchableAttributes(['id', 'data-test-id', 'custom-attr']);
    `);
    
    const newAttrs = await driver.executeScript(`
      return ElementFinder.getSearchableAttributes();
    `);
    console.log(`Updated attributes: ${newAttrs.join(', ')}`);

    // Test 11: Find elements by text using searchable attributes
    console.log('\n--- Test 11: Find elements by text ---');
    const textResults = await driver.executeScript(`
      return ElementFinder.findElement(null, 'seleniumbase');
    `);
    console.log(`Found ${textResults.elements.length} elements with "seleniumbase" text`);
    textResults.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    // Test 12: Find elements by text with element type
    console.log('\n--- Test 12: Find links by text ---');
    const linkTextResults = await driver.executeScript(`
      return ElementFinder.findElement('link', 'seleniumbase');
    `);
    console.log(`Found ${linkTextResults.elements.length} links with "seleniumbase" text`);
    linkTextResults.elements.forEach((item, i) => {
      console.log(`  [${i+1}] tagName=${item.tagName}, bbox=(${Math.round(item.boundingBox.x)}, ${Math.round(item.boundingBox.y)}, ${Math.round(item.boundingBox.width)}x${Math.round(item.boundingBox.height)})`);
    });

    console.log('\n=== All Tests Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

// Run tests
runTests().catch(console.error);