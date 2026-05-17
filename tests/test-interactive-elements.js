/**
 * Test Interactive Elements Finder
 * Tests that interactive elements in interactive-elements.html can be identified
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('=== Interactive Elements Finder Test ===\n');

  const options = new chrome.Options()
    .addArguments('--no-sandbox', '--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Load the interactive elements HTML file
    const htmlPath = join(__dirname, 'fixtures', 'interactive-elements.html');
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

    // Test 1: Find all links
    console.log('--- Test 1: Find all links ---');
    const linkDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('link');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${linkDetails.count} links`);
    linkDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (linkDetails.count < 2) {
      throw new Error(`Expected at least 2 links, found ${linkDetails.count}`);
    }

    // Test 2: Find all buttons
    console.log('\n--- Test 2: Find all buttons ---');
    const buttonDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('button');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${buttonDetails.count} buttons`);
    buttonDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (buttonDetails.count < 4) {
      throw new Error(`Expected at least 4 buttons, found ${buttonDetails.count}`);
    }

    // Test 3: Find all sliders
    console.log('\n--- Test 3: Find all sliders ---');
    const sliderDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('slider');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${sliderDetails.count} sliders`);
    sliderDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (sliderDetails.count < 2) {
      throw new Error(`Expected at least 2 sliders, found ${sliderDetails.count}`);
    }

    // Test 4: Find all file inputs
    console.log('\n--- Test 4: Find all file inputs ---');
    const fileDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('file');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${fileDetails.count} file inputs`);
    fileDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (fileDetails.count < 2) {
      throw new Error(`Expected at least 2 file inputs, found ${fileDetails.count}`);
    }

    // Test 5: Find all lists
    console.log('\n--- Test 5: Find all lists ---');
    const listDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('list');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${listDetails.count} lists`);
    listDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (listDetails.count < 2) {
      throw new Error(`Expected at least 2 lists, found ${listDetails.count}`);
    }

    // Test 6: Find all listitems
    console.log('\n--- Test 6: Find all listitems ---');
    const listitemDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('listitem');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${listitemDetails.count} listitems`);
    listitemDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (listitemDetails.count < 4) {
      throw new Error(`Expected at least 4 listitems, found ${listitemDetails.count}`);
    }

    // Test 7: Find all menus
    console.log('\n--- Test 7: Find all menus ---');
    const menuDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('menu');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${menuDetails.count} menus`);
    menuDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (menuDetails.count < 2) {
      throw new Error(`Expected at least 2 menus, found ${menuDetails.count}`);
    }

    // Test 8: Find all menuitems
    console.log('\n--- Test 8: Find all menuitems ---');
    const menuitemDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('menuitem');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${menuitemDetails.count} menuitems`);
    menuitemDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (menuitemDetails.count < 4) {
      throw new Error(`Expected at least 4 menuitems, found ${menuitemDetails.count}`);
    }

    // Test 9: Find all toolbars
    console.log('\n--- Test 9: Find all toolbars ---');
    const toolbarDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('toolbar');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${toolbarDetails.count} toolbars`);
    toolbarDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (toolbarDetails.count < 2) {
      throw new Error(`Expected at least 2 toolbars, found ${toolbarDetails.count}`);
    }

    // Test 10: Find all images
    console.log('\n--- Test 10: Find all images ---');
    const imageDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('image');
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${imageDetails.count} images`);
    imageDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (imageDetails.count < 2) {
      throw new Error(`Expected at least 2 images, found ${imageDetails.count}`);
    }

    // Test 11: Find all dialogs (include hidden since dialog starts hidden)
    console.log('\n--- Test 11: Find all dialogs ---');
    const dialogDetails = await driver.executeScript(`
      const result = ElementFinder.findElement('dialog', null, false, true);
      return {
        count: result.elements.length,
        elements: result.elements.map(e => ({
          tagName: e.tagName,
          id: e.element.id
        }))
      };
    `);
    console.log(`Found ${dialogDetails.count} dialogs`);
    dialogDetails.elements.forEach(e => {
      console.log(`  - ${e.tagName}#${e.id}`);
    });
    
    if (dialogDetails.count < 1) {
      throw new Error(`Expected at least 1 dialog, found ${dialogDetails.count}`);
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