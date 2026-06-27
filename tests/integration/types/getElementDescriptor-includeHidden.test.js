/**
 * Integration tests for getElementDescriptor includeHidden parameter
 * Tests require a real browser for proper layout and visibility detection
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('getElementDescriptor includeHidden Integration Tests', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Create a test page with visible and hidden buttons sharing the same text
    // Use class for identification (not a searchable attribute)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body>
          <!-- Visible buttons -->
          <button class="btn1">Save</button>
          
          <!-- Hidden button (display:none) -->
          <button class="btn2" style="display:none;">Save</button>
          
          <!-- Another visible button -->
          <button class="btn3">Save</button>
          
          <!-- Hidden button (visibility:hidden) -->
          <button class="btn4" style="visibility:hidden;">Click</button>
          
          <!-- Visible button with same text as hidden -->
          <button class="btn5">Click</button>
          <button class="btn6">Click</button>
          
          <!-- Hidden button (hidden attribute) -->
          <button class="btn7" hidden>Submit</button>
          
          <!-- Visible buttons with Submit text -->
          <button class="btn8">Submit</button>
          <button class="btn9">Submit</button>
          
          <!-- Textless buttons -->
          <button class="btn10"></button>
          <button class="btn11" style="display:none;"></button>
          <button class="btn12"></button>
        </body>
      </html>
    `;

    const fileUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await driver.get(fileUrl);

    const finderPath = join(__dirname, '..', '..', '..', 'index.js');
    const finderCode = readFileSync(finderPath, 'utf8');
    await driver.executeScript(`
      ${finderCode}
      window.ElementFinder = ElementFinder;
    `);

    await driver.sleep(500);
  });

  afterAll(async () => {
    try {
      await driver.quit();
    } catch (err) {
      console.warn('Warning: Error quitting driver:', err.message);
    }
  });

  describe('includeHidden default behavior', () => {
    it('should include hidden elements in index count by default', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn1'));
      `);
      expect(result.identifiableText).toBe('Save');
      expect(result.index).toBe(1);

      const btn2Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn2'));
      `);
      expect(btn2Result.identifiableText).toBe('Save');
      expect(btn2Result.index).toBe(2);

      const btn3Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn3'));
      `);
      expect(btn3Result.identifiableText).toBe('Save');
      expect(btn3Result.index).toBe(3);
    });

    it('should include hidden elements when includeHidden is explicitly true', async () => {
      const result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn1'), true);
      `);
      expect(result.identifiableText).toBe('Save');
      expect(result.index).toBe(1);

      const btn3Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn3'), true);
      `);
      expect(btn3Result.identifiableText).toBe('Save');
      expect(btn3Result.index).toBe(3);
    });
  });

  describe('includeHidden=false excludes hidden elements', () => {
    it('should exclude display:none elements from index count', async () => {
      const btn1Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn1'), false);
      `);
      expect(btn1Result.identifiableText).toBe('Save');
      expect(btn1Result.index).toBe(1);

      const btn3Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn3'), false);
      `);
      expect(btn3Result.identifiableText).toBe('Save');
      expect(btn3Result.index).toBe(2);
    });

    it('should exclude visibility:hidden elements from index count', async () => {
      const btn5Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn5'), false);
      `);
      expect(btn5Result.identifiableText).toBe('Click');
      expect(btn5Result.index).toBe(1);

      const btn6Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn6'), false);
      `);
      expect(btn6Result.identifiableText).toBe('Click');
      expect(btn6Result.index).toBe(2);
    });

    it('should exclude hidden attribute elements from index count', async () => {
      const btn8Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn8'), false);
      `);
      expect(btn8Result.identifiableText).toBe('Submit');
      expect(btn8Result.index).toBe(1);

      const btn9Result = await driver.executeScript(`
        return ElementFinder.getElementDescriptor(document.querySelector('.btn9'), false);
      `);
      expect(btn9Result.identifiableText).toBe('Submit');
      expect(btn9Result.index).toBe(2);
    });

    it('should handle textless buttons with includeHidden false', async () => {
      // Textless buttons fall back to position among ALL same-type elements in frame.
      // With includeHidden=false, hidden elements are skipped from the count.
      const result = await driver.executeScript(`
        // Remove existing textless buttons and create new ones without attrs
        document.querySelector('.btn10')?.remove();
        document.querySelector('.btn11')?.remove();
        document.querySelector('.btn12')?.remove();

        const b1 = document.createElement('button');
        b1.style.border = 'none';
        document.body.appendChild(b1);

        const b2 = document.createElement('button');
        b2.style.display = 'none';
        document.body.appendChild(b2);

        const b3 = document.createElement('button');
        b3.style.border = 'none';
        document.body.appendChild(b3);

        return {
          b1WithHidden: ElementFinder.getElementDescriptor(b1, true),
          b1WithoutHidden: ElementFinder.getElementDescriptor(b1, false),
          b2WithHidden: ElementFinder.getElementDescriptor(b2, true),
          b2WithoutHidden: ElementFinder.getElementDescriptor(b2, false),
          b3WithHidden: ElementFinder.getElementDescriptor(b3, true),
          b3WithoutHidden: ElementFinder.getElementDescriptor(b3, false)
        };
      `);

      // With includeHidden=true (default), all 3 new buttons are counted
      expect(result.b1WithHidden.index).toBe(result.b2WithHidden.index - 1);
      expect(result.b3WithHidden.index).toBe(result.b2WithHidden.index + 1);

      // With includeHidden=false, b2 is skipped so b3's index is b1's index + 1
      expect(result.b3WithoutHidden.index).toBe(result.b1WithoutHidden.index + 1);
    });

    it('should return index 1 when only one visible element matches', async () => {
      // btn8 is the only visible "Submit" button if we hide btn9
      const result = await driver.executeScript(`
        document.querySelector('.btn9').style.display = 'none';
        return ElementFinder.getElementDescriptor(document.querySelector('.btn8'), false);
      `);
      expect(result.identifiableText).toBe('Submit');
      expect(result.index).toBe(1);
    });
  });

  describe('mixed visibility scenarios', () => {
    it('should correctly interleave visible and hidden elements in index', async () => {
      // btn1 (visible), btn2 (hidden), btn3 (visible) all have text "Save"
      // With includeHidden=false, indices should be 1 and 2 for the visible ones
      const result = await driver.executeScript(`
        const btn1 = ElementFinder.getElementDescriptor(document.querySelector('.btn1'), false);
        const btn3 = ElementFinder.getElementDescriptor(document.querySelector('.btn3'), false);
        return { btn1Index: btn1.index, btn3Index: btn3.index };
      `);
      expect(result.btn1Index).toBe(1);
      expect(result.btn3Index).toBe(2);
    });
  });
});
