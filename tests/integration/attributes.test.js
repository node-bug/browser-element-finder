/**
 * Integration tests for ElementFinder attribute matching
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to re-inject the ElementFinder bundle into the current page
async function reinjectFinder(driver, attributes) {
  const finderPath = join(__dirname, '..', '..', 'index.js');
  const finderCode = readFileSync(finderPath, 'utf8');
  await driver.executeScript(`
    ${finderCode}
    window.ElementFinder = ElementFinder;
  `);
  if (attributes) {
    await driver.executeScript(`
      ElementFinder.setSearchableAttributes(${JSON.stringify(attributes)});
    `);
  }
}

const DEFAULT_ATTRIBUTES = [
  "placeholder",
  "value",
  "data-test-id",
  "data-testid",
  "id",
  "resource-id",
  "name",
  "aria-label",
  "hint",
  "title",
  "tooltip",
  "alt",
  "src",
  "aria-labelledby"
];

describe('ElementFinder Attribute Tests', () => {
  const fixture = createDriverFixture({
    url: loadFixture('attributes.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  // Reload page + re-inject finder before every test to handle DOM mutations
  // (e.g., innerHTML = '' in getElementDescriptor tests) that destroy state.
  beforeEach(async () => {
    await fixture.driver.get(fixture.url);
    await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
  });

  describe('setSearchableAttributes', () => {
    it('should set custom searchable attributes', async () => {
      await fixture.driver.executeScript(`
        ElementFinder.setSearchableAttributes(['id', 'class', 'custom-attr']);
      `);
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getSearchableAttributes();
      `);
      expect(attrs).toEqual(['id', 'class', 'custom-attr']);
    });

    it('should throw TypeError for non-array input', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.setSearchableAttributes('not-an-array');
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });
  });

  describe('getSearchableAttributes', () => {
    it('should return a copy of searchable attributes', async () => {
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getSearchableAttributes();
      `);
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
    });

    it('should return a new array each time', async () => {
      const result = await fixture.driver.executeScript(`
        const a1 = ElementFinder.getSearchableAttributes();
        const a2 = ElementFinder.getSearchableAttributes();
        return a1 !== a2;
      `);
      expect(result).toBe(true);
    });
  });

  describe('getSearchableAttributeValues', () => {
    it('should return current values for searchable attributes on an element', async () => {
      const values = await fixture.driver.executeScript(`
        const input = document.getElementById('txt2');
        return ElementFinder.getSearchableAttributeValues(input);
      `);
      expect(values).toEqual({
        placeholder: 'Enter email',
        'data-testid': 'email-input',
        id: 'txt2'
      });
    });

    it('should exclude missing, empty, and non-searchable attributes', async () => {
      const values = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.setAttribute('placeholder', '');
        input.setAttribute('data-testid', '');
        input.setAttribute('custom-attr', 'ignored');
        input.setAttribute('aria-label', 'Email Address');
        return ElementFinder.getSearchableAttributeValues(input);
      `);
      expect(values).toEqual({
        'aria-label': 'Email Address'
      });
    });

    it('should respect custom searchable attributes', async () => {
      const values = await fixture.driver.executeScript(`
        ElementFinder.setSearchableAttributes(['data-qa', 'id']);
        const el = document.createElement('button');
        el.setAttribute('id', 'save');
        el.setAttribute('data-qa', 'save-button');
        el.setAttribute('aria-label', 'Save changes');
        return ElementFinder.getSearchableAttributeValues(el);
      `);
      expect(values).toEqual({
        'data-qa': 'save-button',
        id: 'save'
      });
    });

    it('should return an empty object for null or non-element nodes', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.getSearchableAttributeValues(null),
          ElementFinder.getSearchableAttributeValues(document.createTextNode('not an element'))
        ];
      `);
      expect(result).toEqual([{}, {}]);
    });
  });

  describe('getElementDescriptor', () => {
    it('should return unique id descriptor with type and index', async () => {
      const descriptor = await fixture.driver.executeScript(`
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'email-input';
        document.body.appendChild(input);
        return ElementFinder.getElementDescriptor(input);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'email-input',
        attributeName: 'id',
        index: 1,
        type: 'textbox',
        tagName: 'input',
        formState: { value: '' }
      });
    });

    it('should return duplicate title descriptor with separate occurrence index', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const first = document.createElement('button');
        first.setAttribute('title', 'Save');
        document.body.appendChild(first);
        const second = document.createElement('button');
        second.setAttribute('title', 'Save');
        document.body.appendChild(second);
        return [
          ElementFinder.getElementDescriptor(first),
          ElementFinder.getElementDescriptor(second)
        ];
      `);
      expect(result[0]).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'title',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
      expect(result[1]).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'title',
        index: 2,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should return image src filename without path or extension', async () => {
      const descriptor = await fixture.driver.executeScript(`
        const image = document.createElement('img');
        image.setAttribute('src', '/assets/images/user-avatar.png?size=large#profile');
        document.body.appendChild(image);
        return ElementFinder.getElementDescriptor(image);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'user-avatar',
        attributeName: 'src',
        index: 1,
        type: 'image',
        tagName: 'img'
      });
    });

    it('should fall back to direct text when no searchable attribute exists', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.textContent = 'Submit';
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Submit',
        attributeName: 'text',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should resolve aria-labelledby text for descriptor and uniqueness', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const label = document.createElement('label');
        label.id = 'save-label';
        label.textContent = 'Save';
        document.body.appendChild(label);
        const button = document.createElement('button');
        button.setAttribute('aria-labelledby', 'save-label');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'aria-labelledby',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should resolve multiple aria-labelledby references and ignore missing labels', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const firstLabel = document.createElement('label');
        firstLabel.id = 'first-label';
        firstLabel.textContent = 'First';
        document.body.appendChild(firstLabel);
        const secondLabel = document.createElement('label');
        secondLabel.id = 'second-label';
        secondLabel.textContent = 'Second';
        document.body.appendChild(secondLabel);
        const button = document.createElement('button');
        button.setAttribute('aria-labelledby', 'first-label missing-label second-label');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'First Second',
        attributeName: 'aria-labelledby',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should return null descriptor with index and type when no text exists', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const div = document.createElement('div');
        document.body.appendChild(div);
        return ElementFinder.getElementDescriptor(div);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: null,
        attributeName: null,
        type: 'element',
        tagName: 'div'
      });
      expect(Number.isInteger(descriptor.index)).toBe(true);
      expect(descriptor.index).toBeGreaterThanOrEqual(1);
    });

    it('should return safe descriptor object for null or non-element input', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.getElementDescriptor(null),
          ElementFinder.getElementDescriptor(document.createTextNode('not an element'))
        ];
      `);
      expect(result[0]).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: null,
        tagName: null
      });
      expect(result[1]).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: null,
        tagName: null
      });
    });

    it('should detect semantic element type', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', 'Accept terms');
        document.body.appendChild(checkbox);
        return ElementFinder.getElementDescriptor(checkbox);
      `);
      expect(descriptor.type).toBe('checkbox');
    });

    it('should default type to element when no specific type matches', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.setAttribute('aria-label', 'Panel');
        document.body.appendChild(div);
        return ElementFinder.getElementDescriptor(div);
      `);
      expect(descriptor.type).toBe('element');
    });

    it('should assign sequential indices to multiple buttons with identical text', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const buttons = [];
        for (let i = 0; i < 4; i++) {
          const btn = document.createElement('button');
          btn.textContent = 'Save';
          document.body.appendChild(btn);
          buttons.push(btn);
        }
        return buttons.map(b => ElementFinder.getElementDescriptor(b));
      `);
      result.forEach((desc, i) => {
        expect(desc).toMatchObject({
          identifiableText: 'Save',
          attributeName: 'text',
          type: 'button',
          tagName: 'button',
          index: i + 1
        });
      });
    });

    it('should assign sequential indices to radios that share the same label', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const radios = [];
        for (let i = 0; i < 3; i++) {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.setAttribute('aria-label', 'Choose option');
          document.body.appendChild(radio);
          radios.push(radio);
        }
        return radios.map(r => ElementFinder.getElementDescriptor(r));
      `);
      result.forEach((desc, i) => {
        expect(desc).toMatchObject({
          identifiableText: 'Choose option',
          attributeName: 'aria-label',
          type: 'radio',
          index: i + 1
        });
      });
    });

    it('should not group elements whose identifiableText differs by partial match', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const btn1 = document.createElement('button');
        btn1.textContent = 'Save';
        document.body.appendChild(btn1);
        const btn2 = document.createElement('button');
        btn2.textContent = 'Save As';
        document.body.appendChild(btn2);
        const btn3 = document.createElement('button');
        btn3.textContent = 'Saving';
        document.body.appendChild(btn3);
        return [
          ElementFinder.getElementDescriptor(btn1),
          ElementFinder.getElementDescriptor(btn2),
          ElementFinder.getElementDescriptor(btn3)
        ];
      `);
      expect(result[0].identifiableText).toBe('Save');
      expect(result[1].identifiableText).toBe('Save As');
      expect(result[2].identifiableText).toBe('Saving');
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(1);
    });

    it('should count a textless button by its position among same-type buttons', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const btn1 = document.createElement('button');
        btn1.textContent = 'Save';
        document.body.appendChild(btn1);
        const btn2 = document.createElement('button');
        btn2.textContent = 'Save As';
        document.body.appendChild(btn2);
        const btn3 = document.createElement('button');
        document.body.appendChild(btn3);
        const btn4 = document.createElement('button');
        btn4.textContent = 'Saving';
        document.body.appendChild(btn4);
        return [
          ElementFinder.getElementDescriptor(btn1),
          ElementFinder.getElementDescriptor(btn2),
          ElementFinder.getElementDescriptor(btn3),
          ElementFinder.getElementDescriptor(btn4)
        ];
      `);
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(1);
      expect(result[3].index).toBe(1);
      expect(result[2]).toMatchObject({
        identifiableText: null,
        attributeName: null,
        index: 3,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should not count a button and a checkbox with same text against each other', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button1 = document.createElement('button');
        button1.textContent = 'Submit';
        document.body.appendChild(button1);
        const button2 = document.createElement('button');
        button2.textContent = 'Submit';
        document.body.appendChild(button2);
        const button3 = document.createElement('button');
        button3.textContent = 'Submit';
        document.body.appendChild(button3);
        const checkbox1 = document.createElement('input');
        checkbox1.type = 'checkbox';
        checkbox1.setAttribute('aria-label', 'Submit');
        document.body.appendChild(checkbox1);
        const checkbox2 = document.createElement('input');
        checkbox2.type = 'checkbox';
        checkbox2.setAttribute('aria-label', 'Submit');
        document.body.appendChild(checkbox2);
        return {
          buttons: [button1, button2, button3].map(b => ElementFinder.getElementDescriptor(b)),
          checkboxes: [checkbox1, checkbox2].map(c => ElementFinder.getElementDescriptor(c))
        };
      `);
      result.buttons.forEach((desc, i) => {
        expect(desc).toMatchObject({
          identifiableText: 'Submit',
          type: 'button',
          index: i + 1
        });
      });
      result.checkboxes.forEach((desc, i) => {
        expect(desc).toMatchObject({
          identifiableText: 'Submit',
          type: 'checkbox',
          index: i + 1
        });
      });
    });

    it('should keep a single index sequence when the same text resolves from different attributes', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const byValue = document.createElement('button');
        byValue.value = 'Continue';
        document.body.appendChild(byValue);
        const byAria = document.createElement('button');
        byAria.setAttribute('aria-label', 'Continue');
        document.body.appendChild(byAria);
        const byText = document.createElement('button');
        byText.textContent = 'Continue';
        document.body.appendChild(byText);
        return [
          ElementFinder.getElementDescriptor(byValue),
          ElementFinder.getElementDescriptor(byAria),
          ElementFinder.getElementDescriptor(byText)
        ];
      `);
      expect(result[0]).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'value',
        type: 'button',
        index: 1
      });
      expect(result[1]).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'aria-label',
        type: 'button',
        index: 2
      });
      expect(result[2]).toMatchObject({
        identifiableText: 'Continue',
        attributeName: 'text',
        type: 'button',
        index: 3
      });
    });

    it('should record attributeName as the first matching searchable attribute', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const btn = document.createElement('button');
        btn.setAttribute('placeholder', 'Go');
        btn.setAttribute('value', 'Go');
        document.body.appendChild(btn);
        return ElementFinder.getElementDescriptor(btn);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Go',
        attributeName: 'placeholder',
        index: 1,
        type: 'button'
      });
    });

    it('should prefer direct text over a single searchable attribute', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.textContent = 'Submit';
        button.setAttribute('title', 'Save');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Submit',
        attributeName: 'text',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should prefer direct text over the highest-priority attribute (placeholder)', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.setAttribute('placeholder', 'Enter your name');
        div.textContent = 'Inline';
        document.body.appendChild(div);
        return ElementFinder.getElementDescriptor(div);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Inline',
        attributeName: 'text',
        type: 'element'
      });
    });

    it('should prefer direct text over id', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.id = 'panel-1';
        div.textContent = 'Dashboard';
        document.body.appendChild(div);
        return ElementFinder.getElementDescriptor(div);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Dashboard',
        attributeName: 'text',
        type: 'element'
      });
    });

    it('should prefer direct text over aria-label', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'Close dialog');
        button.textContent = 'X';
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'X',
        attributeName: 'text',
        type: 'button'
      });
    });

    it('should prefer direct text over aria-labelledby resolved text', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const label = document.createElement('label');
        label.id = 'close-label';
        label.textContent = 'Close';
        document.body.appendChild(label);
        const button = document.createElement('button');
        button.setAttribute('aria-labelledby', 'close-label');
        button.textContent = 'Dismiss';
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Dismiss',
        attributeName: 'text',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should prefer direct text over data-testid', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const link = document.createElement('a');
        link.setAttribute('data-testid', 'home-link');
        link.textContent = 'Home';
        document.body.appendChild(link);
        return ElementFinder.getElementDescriptor(link);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Home',
        attributeName: 'text',
        type: 'link'
      });
    });

    it('should prefer direct text over name', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.setAttribute('name', 'username');
        div.textContent = 'User';
        document.body.appendChild(div);
        return ElementFinder.getElementDescriptor(div);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'User',
        attributeName: 'text',
        type: 'element'
      });
    });

    it('should fall through to attributes when direct text is whitespace-only', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.textContent = '   \\n\\t  ';
        button.setAttribute('title', 'Save');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Save',
        attributeName: 'title',
        index: 1,
        type: 'button',
        tagName: 'button'
      });
    });

    it('should skip direct text for ignored elements and use attributes instead', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const script = document.createElement('script');
        script.textContent = 'console.log("ignored text")';
        script.setAttribute('title', 'Script Title');
        document.body.appendChild(script);
        return ElementFinder.getElementDescriptor(script);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Script Title',
        attributeName: 'title',
        type: 'element'
      });
      expect(Number.isInteger(descriptor.index)).toBe(true);
      expect(descriptor.index).toBeGreaterThanOrEqual(1);
    });

    it('should still shorten long direct text when text wins', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.textContent = 'This is a very long button label that exceeds the limit';
        button.setAttribute('title', 'Short');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor.attributeName).toBe('text');
      expect(descriptor.identifiableText).toBe('This is a very long');
      expect(descriptor.identifiableText.length).toBeLessThanOrEqual(25);
    });

    it('should use only the first line of direct text when text wins', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.textContent = 'First line label\\nSecond line ignored';
        button.setAttribute('title', 'Title');
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor.attributeName).toBe('text');
      expect(descriptor.identifiableText).toBe('First line label');
    });

    it('should assign a shared index sequence by text when text wins over differing attributes', async () => {
      const result = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const b1 = document.createElement('button');
        b1.textContent = 'Save';
        b1.setAttribute('title', 'A');
        document.body.appendChild(b1);
        const b2 = document.createElement('button');
        b2.textContent = 'Save';
        b2.setAttribute('title', 'B');
        document.body.appendChild(b2);
        const b3 = document.createElement('button');
        b3.textContent = 'Save';
        b3.setAttribute('aria-label', 'C');
        document.body.appendChild(b3);
        return [b1, b2, b3].map(b => ElementFinder.getElementDescriptor(b));
      `);
      result.forEach((desc, i) => {
        expect(desc).toMatchObject({
          identifiableText: 'Save',
          attributeName: 'text',
          type: 'button',
          index: i + 1
        });
      });
    });

    it('should still resolve to an attribute when no direct text exists (regression)', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'email-input';
        document.body.appendChild(input);
        return ElementFinder.getElementDescriptor(input);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'email-input',
        attributeName: 'id',
        index: 1,
        type: 'textbox',
        tagName: 'input',
        formState: { value: '' }
      });
    });

    it('should prefer text regardless of searchable attribute priority order', async () => {
      const descriptor = await fixture.driver.executeScript(`
        ElementFinder.setSearchableAttributes(['title', 'id', 'placeholder']);
        document.body.innerHTML = '';
        const button = document.createElement('button');
        button.setAttribute('title', 'T');
        button.setAttribute('id', 'I');
        button.setAttribute('placeholder', 'P');
        button.textContent = 'Label';
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Label',
        attributeName: 'text',
        type: 'button'
      });
    });

    it('should prefer text over aria-labelledby even when labelledby is the only attribute', async () => {
      const descriptor = await fixture.driver.executeScript(`
        document.body.innerHTML = '';
        const label = document.createElement('label');
        label.id = 'lbl';
        label.textContent = 'Referenced';
        document.body.appendChild(label);
        const button = document.createElement('button');
        button.setAttribute('aria-labelledby', 'lbl');
        button.textContent = 'Direct';
        document.body.appendChild(button);
        return ElementFinder.getElementDescriptor(button);
      `);
      expect(descriptor).toMatchObject({
        identifiableText: 'Direct',
        attributeName: 'text',
        type: 'button',
        index: 1
      });
    });
  });

  describe('matchesAttribute', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
    it('should return false for null element', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.matchesAttribute(null, 'test');
      `);
      expect(result).toBe(false);
    });

    it('should return true for empty value', async () => {
      const result = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        return [
          ElementFinder.matchesAttribute(el, ''),
          ElementFinder.matchesAttribute(el, null),
          ElementFinder.matchesAttribute(el, undefined)
        ];
      `);
      expect(result).toEqual([true, true, true]);
    });

    it('should match placeholder attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'Enter name'),
          ElementFinder.matchesAttribute(input, 'Enter'),
          ElementFinder.matchesAttribute(input, 'name'),
          ElementFinder.matchesAttribute(input, 'other')
        ];
      `);
      expect(result).toEqual([true, true, true, false]);
    });

    it('should match data-testid attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt2');
        return [
          ElementFinder.matchesAttribute(input, 'email-input'),
          ElementFinder.matchesAttribute(input, 'email')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match id attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'btn1'),
          ElementFinder.matchesAttribute(button, 'btn')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match aria-label attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn2');
        return [
          ElementFinder.matchesAttribute(button, 'Cancel button'),
          ElementFinder.matchesAttribute(button, 'Cancel')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match title attribute', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn3');
        return ElementFinder.matchesAttribute(button, 'Click Me');
      `);
      expect(result).toBe(true);
    });

    it('should support exact matching for attributes', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'Enter name', true),
          ElementFinder.matchesAttribute(input, 'Enter', true),
          ElementFinder.matchesAttribute(input, 'name', true)
        ];
      `);
      expect(result).toEqual([true, false, false]);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'Submit', true),
          ElementFinder.matchesAttribute(button, 'Sub', true),
          ElementFinder.matchesAttribute(button, 'mit', true)
        ];
      `);
      expect(result).toEqual([true, false, false]);
    });

    it('should be case-sensitive', async () => {
      const result = await fixture.driver.executeScript(`
        const input = document.getElementById('txt1');
        return [
          ElementFinder.matchesAttribute(input, 'ENTER NAME'),
          ElementFinder.matchesAttribute(input, 'Enter name')
        ];
      `);
      expect(result).toEqual([false, true]);
    });

    it('should match text content', async () => {
      const result = await fixture.driver.executeScript(`
        const div = document.querySelector('.container');
        return [
          ElementFinder.matchesAttribute(div, 'Nested'),
          ElementFinder.matchesAttribute(div, 'Nested text')
        ];
      `);
      expect(result).toEqual([true, true]);
    });

    it('should match element text content', async () => {
      const result = await fixture.driver.executeScript(`
        const button = document.getElementById('btn1');
        return [
          ElementFinder.matchesAttribute(button, 'Submit'),
          ElementFinder.matchesAttribute(button, 'Submit ')
        ];
      `);
      expect(result).toEqual([true, false]);
    });
  });

  describe('getBoundingBox', () => {
    it('should return bounding box with correct properties', async () => {
      const box = await fixture.driver.executeScript(`
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = '100px';
        el.style.top = '50px';
        el.style.width = '200px';
        el.style.height = '100px';
        document.body.appendChild(el);
        return ElementFinder.getBoundingBox(el);
      `);
      expect(box.x).toBeDefined();
      expect(box.y).toBeDefined();
      expect(box.width).toBeDefined();
      expect(box.height).toBeDefined();
      expect(box.midx).toBeDefined();
      expect(box.midy).toBeDefined();
    });
  });

  describe('getAllElements', () => {
    it('should return all elements including shadow DOM', async () => {
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

    it('should exclude SCRIPT and STYLE elements', async () => {
      const result = await fixture.driver.executeScript(`
        const elements = ElementFinder.getAllElements(document);
        return {
          hasScript: elements.some(el => el.tagName === 'SCRIPT'),
          hasStyle: elements.some(el => el.tagName === 'STYLE')
        };
      `);
      expect(result.hasScript).toBe(false);
      expect(result.hasStyle).toBe(false);
    });

    it('should return empty array for null root', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.getAllElements(null);
      `);
      expect(result).toEqual([]);
    });
  });

  describe('getAllFrames', () => {
    it('should return main frame', async () => {
      const result = await fixture.driver.executeScript(`
        const frames = ElementFinder.getAllFrames(window);
        return {
          length: frames.length,
          isMainFrame: frames[0].isMainFrame,
          frameIndex: frames[0].frameIndex
        };
      `);
      expect(result.length).toBe(1);
      expect(result.isMainFrame).toBe(true);
      expect(result.frameIndex).toBe(-1);
    });
  });

  describe('findElementsByAttribute', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
    it('should throw TypeError for non-string value', async () => {
      const result = await fixture.driver.executeScript(`
        try {
          ElementFinder.findElementsByAttribute(123);
          return 'no-throw';
        } catch (e) {
          return e.constructor.name;
        }
      `);
      expect(result).toBe('TypeError');
    });

    it('should return all elements for empty value', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('').elements.length;
      `);
      expect(result).toBeGreaterThan(0);
    });

    it('should find elements by placeholder attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Enter name');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt1');
    });

    it('should find elements by data-testid attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('email-input');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('txt2');
    });

    it('should find elements by id attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('btn1');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn1');
    });

    it('should find elements by aria-label attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Cancel button');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn2');
    });

    it('should find elements by title attribute', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('Click Me');
      `);
      expect(result.elements.length).toBe(1);
      const id = await result.elements[0].element.getAttribute('id');
      expect(id).toBe('btn3');
    });

    it('should support exact matching for attributes', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.findElementsByAttribute('Enter name', true).elements.length,
          ElementFinder.findElementsByAttribute('Enter', true).elements.length,
          ElementFinder.findElementsByAttribute('Enter', false).elements.length
        ];
      `);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(3);
    });

    it('should support exact matching for text content', async () => {
      const result = await fixture.driver.executeScript(`
        return [
          ElementFinder.findElementsByAttribute('Submit', true).elements.length,
          ElementFinder.findElementsByAttribute('Sub', true).elements.length,
          ElementFinder.findElementsByAttribute('Sub', false).elements.length
        ];
      `);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(1);
    });

    it('should return innermost matches only', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('container');
      `);
      expect(result.elements.length).toBe(1);
      const dataTestId = await result.elements[0].element.getAttribute('data-test-id');
      expect(dataTestId).toBe('container-div');
    });

    it('should return elements with bounding box and tagName', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.findElementsByAttribute('btn1');
      `);
      expect(result.elements[0].boundingBox).toBeDefined();
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].frameIndex).toBe(-1);
    });
  });

  describe('getValidAttributes', () => {
    it('should return array of valid attribute names', async () => {
      const attrs = await fixture.driver.executeScript(`
        return ElementFinder.getValidAttributes();
      `);
      expect(Array.isArray(attrs)).toBe(true);
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('value');
      expect(attrs).toContain('data-test-id');
      expect(attrs).toContain('id');
      expect(attrs).toContain('aria-label');
    });
  });

  describe('highlight/unhighlight', () => {
    beforeEach(async () => {
      await fixture.driver.get(fixture.url);
      await reinjectFinder(fixture.driver, DEFAULT_ATTRIBUTES);
    });
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

    it('should handle highlight with result wrapper format', async () => {
      const result = await fixture.driver.executeScript(`
        const result = ElementFinder.findElementsByAttribute('btn1');
        ElementFinder.highlight(result, 'blue', 2);
        const btn = document.getElementById('btn1');
        return btn.style.outline;
      `);
      expect(result).toMatch(/blue\s+solid\s+2px/);
    });

    it('should handle null input without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight(null);
        ElementFinder.unhighlight(null);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle undefined input without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight(undefined);
        ElementFinder.unhighlight(undefined);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle empty array without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight([]);
        ElementFinder.unhighlight([]);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle empty object without throwing', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.highlight({});
        ElementFinder.unhighlight({});
        return 'ok';
      `);
      expect(result).toBe('ok');
    });
  });
});
