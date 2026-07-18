/**
 * Unit tests for getElementInventory() enrichment behaviour:
 *   - Text-less form controls are always included via a positional #N index.
 *   - Form state is always appended as a {…} suffix.
 *   - Nearby-label rescue is always on: text from a nearby <label> is used
 *     for form controls.
 *
 * Runs in Node.js with JSDOM for fast DOM simulation (no browser automation).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  getElementInventory,
  getElementDescriptor,
} from '../../src/element-finder.js';

const HTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>Form</h1>

  <!-- for-associated labels: control has only a machine value/id -->
  <input type="checkbox" id="cb1" name="pref" value="iframe">
  <label for="cb1">CheckBox in iFrame</label>

  <input type="checkbox" id="cb2" name="pref" value="test">
  <label for="cb2">CheckBox</label>

  <input type="radio" id="r1" name="radio" value="1">
  <label for="r1">RadioButton 1</label>

  <select id="sel1">
    <option value="">Please choose...</option>
    <option value="25">Set to 25%</option>
  </select>
  <label for="sel1">Select Dropdown</label>

  <!-- wrapping label: control is a descendant of <label> -->
  <label>Search <input type="text" id="wrap1"></label>

  <!-- text-less control with no label and no own attributes at all -->
  <input type="text">

  <!-- explicit aria-label should win over a nearby label -->
  <input type="checkbox" id="cb3" value="x" aria-label="Explicit Aria">
  <label for="cb3">Nearby Label</label>

  <!-- placeholder should win over a nearby label -->
  <input type="text" id="tb1" placeholder="Type here">
  <label for="tb1">Nearby Placeholder Label</label>
</body>
</html>
`;

describe('getElementInventory enrichment options', () => {
  let window;
  let document;

  beforeAll(() => {
    const dom = new JSDOM(HTML, { url: 'http://localhost', pretendToBeVisual: true });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.Node = window.Node;
  });

  afterAll(() => {
    window.close();
    delete global.window;
    delete global.document;
    delete global.Node;
  });

  it('default tree includes text-less form controls with nearby labels and form state', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    // Nearby-label rescue is always on, so for-associated controls resolve to
    // their label text (which wins over machine attributes) with form state
    // appended.
    expect(entries).toContain('checkbox:CheckBox in iFrame {checked:false}');
    expect(entries).toContain('radio:RadioButton 1 {set:false}');
    expect(entries).toContain('dropdown:Select Dropdown {selected:"Please choose...",options:["Please choose...","Set to 25%"]}');
    // The truly anonymous control (no id/name/value) is included via #N.
    expect(entries.some((e) => e.startsWith('textbox:#'))).toBe(true);
  });

  it('nearby labels rescue text from for-associated labels', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    expect(entries).toContain('checkbox:CheckBox in iFrame {checked:false}');
    expect(entries).toContain('checkbox:CheckBox {checked:false}');
    expect(entries).toContain('radio:RadioButton 1 {set:false}');
    expect(entries).toContain('dropdown:Select Dropdown {selected:"Please choose...",options:["Please choose...","Set to 25%"]}');
  });

  it('nearby labels rescue text from wrapping labels', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    expect(entries).toContain('textbox:Search {value:""}');
  });

  it('explicit aria-label wins over a nearby label', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    expect(entries).toContain('checkbox:Explicit Aria {checked:false}');
    expect(entries).not.toContain('checkbox:Nearby Label');
  });

  it('placeholder wins over a nearby label', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    expect(entries).toContain('textbox:Type here {value:""}');
    expect(entries).not.toContain('textbox:Nearby Placeholder Label');
  });

  it('text-less controls get a positional #N when no text is available', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    // The bare <input type="text"> has no label and no own attributes →
    // positional identifier. It is #2 because the wrapping-label textbox
    // (Search) precedes it in document order among textboxes.
    expect(entries.some((e) => e.startsWith('textbox:#2'))).toBe(true);
  });

  it('non-form text-less elements stay excluded', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    // Generic <h1> has text, but a bare <div> with no text must stay excluded.
    const divs = entries.filter((e) => e.startsWith('element:'));
    expect(divs.every((e) => !e.startsWith('element:#'))).toBe(true);
  });

  it('form state is appended to form controls by default', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    // cb1 is unchecked by default.
    expect(entries).toContain('checkbox:CheckBox in iFrame {checked:false}');
    // sel1's first option has text, so it is the selected value.
    expect(entries).toContain('dropdown:Select Dropdown {selected:"Please choose...",options:["Please choose...","Set to 25%"]}');
  });

  it('nearby labels + text-less + form state produce readable, stateful, complete entries', () => {
    const tree = getElementInventory(false);
    const entries = tree[0].elements;
    expect(entries).toContain('checkbox:CheckBox in iFrame {checked:false}');
    expect(entries).toContain('radio:RadioButton 1 {set:false}');
    expect(entries).toContain('dropdown:Select Dropdown {selected:"Please choose...",options:["Please choose...","Set to 25%"]}');
    expect(entries).toContain('textbox:Search {value:""}');
    expect(entries.some((e) => e.startsWith('textbox:#2'))).toBe(true);
  });

  it('getElementDescriptor exposes nearby label', () => {
    const cb = document.getElementById('cb1');
    const d = getElementDescriptor(cb, true);
    expect(d.identifiableText).toBe('CheckBox in iFrame');
    expect(d.attributeName).toBe('label');
  });
});
