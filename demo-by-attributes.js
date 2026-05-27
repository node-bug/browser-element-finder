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
        const htmlPath = join(__dirname, 'tests', 'integration', 'fixtures', 'forms.html');
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

// Find elements by text 'Single' (matches label text and input id)
        const result = await driver.executeScript(`
      return ElementFinderByAttribute.findElementByAttributes('Single');
    `);
        console.log(`Found ${result.elements.length} elements with text 'Single':`);
        result.elements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName} - id: ${el.element?.id || '(no id)'}`);
        });

        // Highlight the found elements
        await driver.executeScript(`
      ElementFinderByAttribute.highlight(arguments[0]);
    `, result.elements);

    } finally {
        await driver.quit();
        console.log('\nBrowser closed.');
    }
}

test();