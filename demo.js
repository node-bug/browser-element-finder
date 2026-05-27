/**
 * Demo script to launch browser and find textbox elements
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
        const htmlPath = join(__dirname, 'tests', 'integration', 'fixtures', 'forms.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        await driver.get(fileUrl);

        // Load the element finder library
        const finderPath = join(__dirname, 'index.js');
        const finderCode = readFileSync(finderPath, 'utf8');
        await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

        console.log('Looking for textbox elements...');

        // Find all textboxes
        const result1 = await driver.executeScript(`
      return ElementFinder.findElements('textbox', 'Single-line Text');
    `);

        const result2 = await driver.executeScript(`
      return ElementFinder.findElements('textbox');
    `);

        const result3 = await driver.executeScript(`
      return ElementFinder.findElements(null, 'Single-line Text');
    `);

        console.log(`Found ${result1.elements.length} textbox elements with text:`);
        console.log(`Found ${result2.elements.length} textbox elements (no text filter):`);
        console.log(`Found ${result3.elements.length} elements by text only:`);
        result1.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - ${el.id || el.className || '(no id)'}`);
        });
        result2.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - ${el.id || el.className || '(no id)'}`);
        });
        result3.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - ${el.id || el.className || '(no id)'}`);
        });
    } finally {
        await driver.quit();
        console.log('\nBrowser closed.');
    }
}

test()