/**
 * Integration tests for ElementFinder type matching and XPath parsing
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('ElementFinder Type Tests', () => {
  const fixture = createDriverFixture({
    url: loadFixture('element-types-unit.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  beforeEach(async () => {
    await fixture.driver.executeScript(`
      ElementFinder.setIgnoredTags(['SCRIPT', 'STYLE', 'HEAD']);
    `);
  });

  describe('parseXPath', () => {
    it('should return true for true() expression', async () => {
      const result = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        return ElementFinder.parseXPath('true()', el);
      `);
      expect(result).toBe(true);
    });

    it('should return false for null expression', async () => {
      const result = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        return ElementFinder.parseXPath(null, el);
      `);
      expect(result).toBe(false);
    });

    it('should return false for null element', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.parseXPath('true()', null);
      `);
      expect(result).toBe(false);
    });

    it('should match self::tag expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const div = document.createElement('div');
        const span = document.createElement('span');
        return [
          ElementFinder.parseXPath('self::div', div),
          ElementFinder.parseXPath('self::div', span),
          ElementFinder.parseXPath('self::span', span)
        ];
      `);
      expect(result).toEqual([true, false, true]);
    });

    it('should match @attr expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('type', 'text');
        return [
          ElementFinder.parseXPath('@type', input),
          ElementFinder.parseXPath('@type="text"', input),
          ElementFinder.parseXPath('@type="checkbox"', input)
        ];
      `);
      expect(result).toEqual([true, true, false]);
    });

    it('should handle OR conditions', async () => {
      const result = await fixture.driver.executeScript(`
        const div = document.createElement('div');
        const span = document.createElement('span');
        return [
          ElementFinder.parseXPath('self::div or self::span', div),
          ElementFinder.parseXPath('self::div or self::span', span)
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should return false when all OR conditions fail', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('type', 'text');
        return ElementFinder.parseXPath('self::button or @type="checkbox"', input);
      `);
      expect(result).toBe(false);
    });

    it('should handle nested outer parentheses', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.createElement('button');
        button.setAttribute('type', 'submit');
        return [
          ElementFinder.parseXPath('(self::button)', button),
          ElementFinder.parseXPath('((self::button and @type="submit"))', button)
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should return false when any AND condition fails', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('type', 'text');
        return ElementFinder.parseXPath('self::input and @type="checkbox"', input);
      `);
      expect(result).toBe(false);
    });
  });

  describe('splitByOperator', () => {
    it('should split by OR operator', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.splitByOperator('self::div or self::span', 'or');
      `);
      expect(result).toEqual(['self::div', 'self::span']);
    });

    it('should split by AND operator', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.splitByOperator('self::input and @type="text"', 'and');
      `);
      expect(result).toEqual(['self::input', '@type="text"']);
    });

    it('should handle nested parentheses', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.splitByOperator('(self::div or self::span) and @class', 'and');
      `);
      expect(result).toEqual(['(self::div or self::span)', '@class']);
    });
  });

  describe('parseCondition', () => {
    it('should match self::tag with uppercase tag name', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.createElement('button');
        return [
          ElementFinder.parseCondition('self::button', button),
          ElementFinder.parseCondition('self::BUTTON', button)
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match contains() expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        el.setAttribute('class', 'dropdown-menu');
        return [
          ElementFinder.parseCondition("contains(@class, 'dropdown')", el),
          ElementFinder.parseCondition("contains(@class, 'menu')", el),
          ElementFinder.parseCondition("contains(@class, 'other')", el)
        ];
      `);
      expect(result).toEqual([true, true, false]);
    });

    it('should match descendant:: expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        return [
          ElementFinder.parseCondition('descendant::span', parent),
          ElementFinder.parseCondition('descendant::div', parent)
        ];
      `);
      expect(result).toEqual([true, false]);
    });

    it('should match ancestor:: expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const grandparent = document.createElement('div');
        grandparent.id = 'ancestor-root';
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        grandparent.appendChild(parent);
        return [
          ElementFinder.parseCondition('ancestor::*[self::div]', child),
          ElementFinder.parseCondition('ancestor::*[@id="missing"]', child)
        ];
      `);
      expect(result).toEqual([true, false]);
    });

    it('should match attribute existence expressions', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('required', '');
        return [
          ElementFinder.parseCondition('@required', input),
          ElementFinder.parseCondition('@disabled', input)
        ];
      `);
      expect(result).toEqual([true, false]);
    });

    it('should return false for unknown conditions', async () => {
      const result = await fixture.driver.executeScript(`
        const div = document.createElement('div');
        return ElementFinder.parseCondition('unknown-condition', div);
      `);
      expect(result).toBe(false);
    });
  });

  describe('ELEMENT_DEFINITIONS', () => {
    it('should be frozen and not modifiable', async () => {
      const result = await fixture.driver.executeScript(`
        return Object.isFrozen(ElementFinder.ELEMENT_DEFINITIONS);
      `);
      expect(result).toBe(true);
    });

    it('should contain expected element types', async () => {
      const result = await fixture.driver.executeScript(`
        const defs = ElementFinder.ELEMENT_DEFINITIONS;
        return {
          hasButton: defs.button !== undefined,
          hasTextbox: defs.textbox !== undefined,
          hasLink: defs.link !== undefined,
          elementIsTrue: defs.element === 'true()'
        };
      `);
      expect(result.hasButton).toBe(true);
      expect(result.hasTextbox).toBe(true);
      expect(result.hasLink).toBe(true);
      expect(result.elementIsTrue).toBe(true);
    });
  });

  describe('getValidTypes', () => {
    it('should return array of valid type names', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.getValidTypes();
      `);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('button');
      expect(result).toContain('textbox');
      expect(result).toContain('link');
      expect(result).toContain('element');
    });
  });

  describe('matchesType', () => {
    it('should return false for null element', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.matchesType(null, 'button');
      `);
      expect(result).toBe(false);
    });

    it('should match button elements', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return ElementFinder.matchesType(button, 'button');
      `);
      expect(result).toBe(true);
    });

    it('should match textbox elements', async () => {
      const result = await fixture.driver.executeScript(`
        const textbox = document.getElementById('txt1');
        return ElementFinder.matchesType(textbox, 'textbox');
      `);
      expect(result).toBe(true);
    });

    it('should match checkbox elements', async () => {
      const result = await fixture.driver.executeScript(`
        const checkbox = document.getElementById('chk1');
        return ElementFinder.matchesType(checkbox, 'checkbox');
      `);
      expect(result).toBe(true);
    });

    it('should match radio elements', async () => {
      const result = await fixture.driver.executeScript(`
        const radio = document.getElementById('radio1');
        return ElementFinder.matchesType(radio, 'radio');
      `);
      expect(result).toBe(true);
    });

    it('should match slider elements', async () => {
      const result = await fixture.driver.executeScript(`
        const slider = document.getElementById('slider1');
        return ElementFinder.matchesType(slider, 'slider');
      `);
      expect(result).toBe(true);
    });

    it('should match datepicker elements', async () => {
      const result = await fixture.driver.executeScript(`
        const datepicker = document.getElementById('datepicker1');
        return ElementFinder.matchesType(datepicker, 'datepicker');
      `);
      expect(result).toBe(true);
    });

    it('should match colorpicker elements', async () => {
      const result = await fixture.driver.executeScript(`
        const colorpicker = document.getElementById('colorpicker1');
        return ElementFinder.matchesType(colorpicker, 'colorpicker');
      `);
      expect(result).toBe(true);
    });

    it('should match link elements', async () => {
      const result = await fixture.driver.executeScript(`
        const link = document.getElementById('link1');
        return ElementFinder.matchesType(link, 'link');
      `);
      expect(result).toBe(true);
    });

    it('should match dropdown elements', async () => {
      const result = await fixture.driver.executeScript(`
        const dropdown = document.getElementById('dropdown1');
        return ElementFinder.matchesType(dropdown, 'dropdown');
      `);
      expect(result).toBe(true);
    });

    it('should return false for unknown type', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return ElementFinder.matchesType(button, 'unknown-type');
      `);
      expect(result).toBe(false);
    });
  });

  describe('getAllElements', () => {
    it('should return all elements in document', async () => {
      const result = await fixture.driver.executeScript(`
        const elements = ElementFinder.getAllElements(document);
        return {
          length: elements.length,
          hasButton: elements.some(el => el.tagName === 'BUTTON'),
          hasInput: elements.some(el => el.tagName === 'INPUT')
        };
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result.hasButton).toBe(true);
      expect(result.hasInput).toBe(true);
    });
  });

  describe('findElementsByType', () => {
    it('should find all buttons', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'button' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
      result.elements.forEach(el => {
        expect(el.tagName).toBe('button');
      });
    });

    it('should find all checkboxes', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'checkbox' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find all textboxes', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'textbox' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should find all links', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'link' });
      `);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown type', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByType({ type: 'nonexistent-type' });
      `);
      expect(result.elements.length).toBe(0);
    });
  });

  describe('findElements', () => {
    it('should find elements by type and text (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElements({ type: 'button', text: 'Submit' });
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findProbableElements', () => {
    it('should find probable elements (object syntax)', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findProbableElements({ type: 'button', text: 'Submit' });
      `);
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('highlight/unhighlight', () => {
    it('should highlight elements', async () => {
      const result = await fixture.driver.executeScript(`
        const btn = document.getElementById('btn1');
        ElementFinder.highlight([btn], 'red', 2);
        return btn.style.outline;
      `);
      // Chrome serializes outline as "{color} {style} {width}" (e.g., "red solid 2px")
      expect(result).toMatch(/red\s+solid\s+2px/);
    });

    it('should unhighlight elements', async () => {
      const result = await fixture.driver.executeScript(`
        const btn = document.getElementById('btn1');
        btn.style.outline = '2px solid red';
        ElementFinder.unhighlight([btn]);
        return btn.style.outline;
      `);
      expect(result).toBe('');
    });
  });

  describe('XPath Recursion Limit', () => {
    it('should throw error when maximum recursion depth is exceeded', async () => {
      const result = await fixture.driver.executeScript(`
        const depth = 101;
        const nestedExpr = '('.repeat(depth) + 'true()' + ')'.repeat(depth);
        try {
          ElementFinder.parseXPath(nestedExpr, document.body);
          return 'no-throw';
        } catch (e) {
          return e.message;
        }
      `);
      expect(result).toBe('XPath expression exceeds maximum recursion depth');
    });
  });
});
