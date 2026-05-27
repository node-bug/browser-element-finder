/**
 * Demo script to launch browser and find elements by attribute values
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function test() {
    console.log('Launching browser...');

    const options = new chrome.Options()
        .addArguments('--no-sandbox', '--disable-dev-shm-usage');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        // Load the forms.html fixture
        const htmlPath = join(__dirname, 'tests', 'integration', 'fixtures', 'shadow-dom.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        await driver.get(fileUrl);

        // Load the element finder by attribute library
        const finderPath = join(__dirname, 'index-by-attribute.js');
        const finderCode = readFileSync(finderPath, 'utf8');
        await driver.executeScript(`
      ${finderCode}
      window.ElementFinderByAttribute = ElementFinderByAttribute;
    `);

// Find elements by partial text match (default behavior)
        const partialResult = await driver.executeScript(`
      return ElementFinderByAttribute.findElementByAttributes('Dynamic Button');
    `);
        console.log(`Found ${partialResult.elements.length} elements with partial text 'ike browser':`);
        partialResult.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - id: ${el.element?.id || '(no id)'}`);
        });

        // Highlight the found elements
        await driver.executeScript(`
      ElementFinderByAttribute.highlight(arguments[0]);
    `, partialResult.elements);

        // Find elements by exact text match
        const exactResult = await driver.executeScript(`
      return ElementFinderByAttribute.findElementByAttributes('ike browser', true);
    `);
        console.log(`\nFound ${exactResult.elements.length} elements with exact text 'ike browser':`);
        exactResult.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - id: ${el.element?.id || '(no id)'}`);
        });

    console.log()

    } finally {
        await driver.quit();
        console.log('\nBrowser closed.');
    }
}

test();