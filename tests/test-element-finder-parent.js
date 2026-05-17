/**
 * Test script for ElementFinder parent element functionality
 * 
 * This script tests finding elements within a parent element using Selenium.
 * Run with: node test-element-finder-parent.js
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Testing ElementFinder with Parent Element ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Navigate to the dropdowns test page
    await driver.get(`file://${join(__dirname, 'fixtures', 'dropdowns.html')}`);

    // Inject the ElementFinder library
    const finderPath = join(__dirname, '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    // Wait for page to load
    await driver.sleep(1000);

    // Test 1: Find a section element (the parent container)
    console.log('Test 1: Find section element');
    const sectionResult = await driver.executeScript(`
      const result = ElementFinder.findElement(null, 'standard-select-section');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`  Found ${sectionResult.count} elements with id "standard-select-section"`);
    
    if (sectionResult.count === 0) {
      throw new Error('Could not find section element');
    }

    // Test 2: Use the found element as parent to find child elements
    console.log('\nTest 2: Find child elements within parent');
    const childResult = await driver.executeScript(`
      // First find the parent section
      const parentResult = ElementFinder.findElement(null, 'standard-select-section');
      if (parentResult.elements.length === 0) return { count: 0, elements: [] };
      
      const parent = parentResult.elements[0].element;
      
      // Now find dropdowns within that parent
      const result = ElementFinder.findElement('dropdown', null, false, false, parent);
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`  Found ${childResult.count} dropdown elements within parent`);
    
    if (childResult.count === 0) {
      throw new Error('Could not find dropdown elements within parent');
    }

    // Test 3: Verify parent scoping works - find elements outside parent
    console.log('\nTest 3: Verify parent scoping');
    const allDropdowns = await driver.executeScript(`
      const result = ElementFinder.findElement('dropdown');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`  Found ${allDropdowns.count} dropdown elements on entire page`);
    
    // Assertion: Parent scoping should find fewer elements than full page
    if (allDropdowns.count <= childResult.count) {
      throw new Error(`Parent scoping not working correctly - expected ${allDropdowns.count} > ${childResult.count}`);
    }
    
    // Assertion: Should find exactly 5 dropdowns on full page
    if (allDropdowns.count !== 5) {
      throw new Error(`Expected 5 dropdowns on full page, found ${allDropdowns.count}`);
    }
    
    // Assertion: Should find exactly 2 dropdowns within parent section
    if (childResult.count !== 2) {
      throw new Error(`Expected 2 dropdowns within parent, found ${childResult.count}`);
    }

    console.log('\n=== All Tests Passed ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);