/**
 * Integration tests for getFormState in the ElementFinder module.
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

describe('getFormState', () => {
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

  it('should return undefined when element or type is missing', async () => {
    const result = await fixture.driver.executeScript(`
      return [
        ElementFinder.getFormState(null, 'textbox'),
        ElementFinder.getFormState(document.createElement('input'), null)
      ];
    `);
    // Selenium serializes undefined as null when returning to Node.js
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it('should return undefined for non-form element types', async () => {
    const result = await fixture.driver.executeScript(`
      const button = document.createElement('button');
      return ElementFinder.getFormState(button, 'button');
    `);
    // Selenium serializes undefined as null when returning to Node.js
    expect(result).toBeNull();
  });

  it('should capture textbox value', async () => {
    const result = await fixture.driver.executeScript(`
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'hello';
      return ElementFinder.getFormState(input, 'textbox');
    `);
    expect(result).toEqual({ value: 'hello' });
  });

  it('should capture empty textbox value as empty string', async () => {
    const result = await fixture.driver.executeScript(`
      const input = document.getElementById('txt1');
      return ElementFinder.getFormState(input, 'textbox');
    `);
    expect(result).toEqual({ value: '' });
  });

  it('should capture checkbox checked state', async () => {
    const result = await fixture.driver.executeScript(`
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      const state1 = ElementFinder.getFormState(checkbox, 'checkbox');
      checkbox.checked = false;
      const state2 = ElementFinder.getFormState(checkbox, 'checkbox');
      return [state1, state2];
    `);
    expect(result[0]).toEqual({ checked: true });
    expect(result[1]).toEqual({ checked: false });
  });

  it('should capture radio set state', async () => {
    const result = await fixture.driver.executeScript(`
      const radio = document.getElementById('radio1');
      radio.checked = true;
      const state1 = ElementFinder.getFormState(radio, 'radio');
      radio.checked = false;
      const state2 = ElementFinder.getFormState(radio, 'radio');
      return [state1, state2];
    `);
    expect(result[0]).toEqual({ set: true });
    expect(result[1]).toEqual({ set: false });
  });

  it('should capture switch on state from checked property', async () => {
    const result = await fixture.driver.executeScript(`
      const sw = document.createElement('input');
      sw.type = 'checkbox';
      sw.setAttribute('role', 'switch');
      sw.checked = true;
      const state1 = ElementFinder.getFormState(sw, 'switch');
      sw.checked = false;
      const state2 = ElementFinder.getFormState(sw, 'switch');
      return [state1, state2];
    `);
    expect(result[0]).toEqual({ on: true });
    expect(result[1]).toEqual({ on: false });
  });

  it('should capture switch on state from aria-checked', async () => {
    const result = await fixture.driver.executeScript(`
      const sw = document.createElement('div');
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', 'true');
      const state1 = ElementFinder.getFormState(sw, 'switch');
      sw.setAttribute('aria-checked', 'false');
      const state2 = ElementFinder.getFormState(sw, 'switch');
      return [state1, state2];
    `);
    expect(result[0]).toEqual({ on: true });
    expect(result[1]).toEqual({ on: false });
  });

  it('should capture dropdown selected option and options list', async () => {
    const result = await fixture.driver.executeScript(`
      const select = document.getElementById('dropdown1');
      const state1 = ElementFinder.getFormState(select, 'dropdown');
      select.value = 'Option 2';
      const state2 = ElementFinder.getFormState(select, 'dropdown');
      return [state1, state2];
    `);
    expect(result[0].options).toEqual(['Option 1', 'Option 2']);
    expect(result[0].selected).toBe('Option 1');
    expect(result[1].selected).toBe('Option 2');
  });

  it('should capture slider value as number', async () => {
    const result = await fixture.driver.executeScript(`
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.value = '42';
      return ElementFinder.getFormState(slider, 'slider');
    `);
    expect(result).toEqual({ value: 42 });
  });

  it('should capture file fileName', async () => {
    const result = await fixture.driver.executeScript(`
      const file = document.createElement('input');
      file.type = 'file';
      Object.defineProperty(file, 'files', {
        value: [{ name: 'resume.pdf' }],
        configurable: true
      });
      return ElementFinder.getFormState(file, 'file');
    `);
    expect(result).toEqual({ fileName: 'resume.pdf' });
  });

  it('should capture colorpicker value', async () => {
    const result = await fixture.driver.executeScript(`
      const color = document.createElement('input');
      color.type = 'color';
      color.value = '#ff0000';
      return ElementFinder.getFormState(color, 'colorpicker');
    `);
    expect(result).toEqual({ value: '#ff0000' });
  });

  it('should capture datepicker value', async () => {
    const result = await fixture.driver.executeScript(`
      const date = document.createElement('input');
      date.type = 'date';
      date.value = '2026-07-15';
      return ElementFinder.getFormState(date, 'datepicker');
    `);
    expect(result).toEqual({ value: '2026-07-15' });
  });
});
