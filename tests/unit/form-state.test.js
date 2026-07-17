/**
 * Unit tests for getFormState in the ElementFinder Node.js module.
 * These tests run in Node.js (JSDOM) and verify that per-type form control
 * state is captured correctly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getFormState } from '../../src/element-finder.js';

describe('getFormState', () => {
  let window;
  let document;

  beforeAll(() => {
    const fixturePath = resolve(__dirname, '..', 'fixtures/attributes.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously'
    });

    window = dom.window;
    document = window.document;
  });

  it('should return undefined when element or type is missing', () => {
    expect(getFormState(null, 'textbox')).toBeUndefined();
    expect(getFormState(document.createElement('input'), null)).toBeUndefined();
  });

  it('should return undefined for non-form element types', () => {
    const button = document.createElement('button');
    expect(getFormState(button, 'button')).toBeUndefined();
  });

  it('should capture textbox value', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'hello';
    expect(getFormState(input, 'textbox')).toEqual({ value: 'hello' });
  });

  it('should capture empty textbox value as empty string', () => {
    const input = document.getElementById('txt1');
    expect(getFormState(input, 'textbox')).toEqual({ value: '' });
  });

  it('should capture checkbox checked state', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    expect(getFormState(checkbox, 'checkbox')).toEqual({ checked: true });

    checkbox.checked = false;
    expect(getFormState(checkbox, 'checkbox')).toEqual({ checked: false });
  });

  it('should capture radio set state', () => {
    const radio = document.getElementById('radio1');
    radio.checked = true;
    expect(getFormState(radio, 'radio')).toEqual({ set: true });

    radio.checked = false;
    expect(getFormState(radio, 'radio')).toEqual({ set: false });
  });

  it('should capture switch on state from checked property', () => {
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.setAttribute('role', 'switch');
    sw.checked = true;
    expect(getFormState(sw, 'switch')).toEqual({ on: true });

    sw.checked = false;
    expect(getFormState(sw, 'switch')).toEqual({ on: false });
  });

  it('should capture switch on state from aria-checked', () => {
    const sw = document.createElement('div');
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', 'true');
    expect(getFormState(sw, 'switch')).toEqual({ on: true });

    sw.setAttribute('aria-checked', 'false');
    expect(getFormState(sw, 'switch')).toEqual({ on: false });
  });

  it('should capture dropdown selected option and options list', () => {
    const select = document.getElementById('dropdown1');
    const state = getFormState(select, 'dropdown');
    expect(state.options).toEqual(['Option 1', 'Option 2']);
    expect(state.selected).toBe('Option 1');

    select.value = 'Option 2';
    const updated = getFormState(select, 'dropdown');
    expect(updated.selected).toBe('Option 2');
  });

  it('should capture slider value as number', () => {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.value = '42';
    expect(getFormState(slider, 'slider')).toEqual({ value: 42 });
  });

  it('should capture file fileName', () => {
    const file = document.createElement('input');
    file.type = 'file';
    // jsdom does not fully support FileList; simulate via defineProperty
    Object.defineProperty(file, 'files', {
      value: [{ name: 'resume.pdf' }],
      configurable: true
    });
    expect(getFormState(file, 'file')).toEqual({ fileName: 'resume.pdf' });
  });

  it('should capture colorpicker value', () => {
    const color = document.createElement('input');
    color.type = 'color';
    color.value = '#ff0000';
    expect(getFormState(color, 'colorpicker')).toEqual({ value: '#ff0000' });
  });

  it('should capture datepicker value', () => {
    const date = document.createElement('input');
    date.type = 'date';
    date.value = '2026-07-15';
    expect(getFormState(date, 'datepicker')).toEqual({ value: '2026-07-15' });
  });
});
