/**
 * Test Tables Element Finder
 * Tests that table elements in tables.html can be identified
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Tables Element Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the tables HTML file
    const htmlPath = join(__dirname, 'fixtures', 'tables.html');
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

    // Test 1: Find all tables
    console.log('--- Test 1: Find all tables ---');
    const tableDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('table');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${tableDetails.count} tables`);
    tableDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (tableDetails.count < 2) {
      throw new Error(`Expected at least 2 tables, found ${tableDetails.count}`);
    }

    // Test 2: Find all rows
    console.log('\n--- Test 2: Find all rows ---');
    const rowDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('row');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName
        }))
      };
    `);
    console.log(`Found ${rowDetails.count} rows`);
    
    if (rowDetails.count < 10) {
      throw new Error(`Expected at least 10 rows, found ${rowDetails.count}`);
    }

    // Test 3: Find all columns (cells)
    console.log('\n--- Test 3: Find all columns (cells) ---');
    const columnDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('column');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName
        }))
      };
    `);
    console.log(`Found ${columnDetails.count} columns (cells)`);
    
    if (columnDetails.count < 15) {
      throw new Error(`Expected at least 15 columns, found ${columnDetails.count}`);
    }

    // Test 4: Find table by text content
    console.log('\n--- Test 4: Find table by text content ---');
    const textResult = await driver.executeScript(`
      const result = ElementFinder.findElement('table', 'Alice');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${textResult.count} table containing "Alice"`);
    
    if (textResult.count !== 1) {
      throw new Error(`Expected 1 table with "Alice", found ${textResult.count}`);
    }

    // Test 5: Find cell by text content
    console.log('\n--- Test 5: Find cell by text content ---');
    const cellResult = await driver.executeScript(`
      const result = ElementFinder.findElement('column', 'Paris');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          text: e.element.textContent.trim()
        }))
      };
    `);
    console.log(`Found ${cellResult.count} cell containing "Paris"`);
    
    if (cellResult.count !== 1) {
      throw new Error(`Expected 1 cell with "Paris", found ${cellResult.count}`);
    }

    console.log('\n=== All Tests Passed ===');

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await driver.quit();
  }
}

runTests().catch(console.error);