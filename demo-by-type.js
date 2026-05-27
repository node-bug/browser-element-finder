/**
 * Demo script to find and highlight textbox elements using findElementByType
 */

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function demo() {
    const options = new chrome.Options()
        .addArguments('--no-sandbox', '--disable-dev-shm-usage');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        // Load the forms.html fixture
        const htmlPath = join(__dirname, 'tests', 'integration', 'fixtures', 'switches.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        await driver.get(fileUrl);

        // Load the element finder by type library
        const finderPath = join(__dirname, 'index-by-type.js');
        const finderCode = readFileSync(finderPath, 'utf8');
        await driver.executeScript(`
            ${finderCode}
            window.ElementFinderByType = ElementFinderByType;
        `);

        // Find and highlight all textboxes
        const res = await driver.executeScript(`
            const result = ElementFinderByType.findElementByType('element');
            console.log('Found ' + result.elements.length + ' textbox elements');
            ElementFinderByType.highlight(result.elements);
            return result
        `);
        console.log(res.elements.length)

        // Wait to see highlights
        await driver.sleep(2000);

    } finally {
        await driver.quit();
    }
}

demo().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});