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
    const tree = getElementInventory();
    const entries = tree[0].elements;
    // Nearby-label rescue is always on, so for-associated controls resolve to
    // their label text (which wins over machine attributes) with form state
    // exposed as an object.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', inViewport: false, formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'radio', description: 'RadioButton 1', inViewport: false, formState: { set: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', inViewport: false, formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%'] } }));
    // The truly anonymous control (no id/name/value) is included via index.
    expect(entries.some((e) => e.type === 'textbox' && e.description === null)).toBe(true);
  });

  it('nearby labels rescue text from for-associated labels', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', inViewport: false, formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox', inViewport: false, formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'radio', description: 'RadioButton 1', inViewport: false, formState: { set: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', inViewport: false, formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%'] } }));
  });

  it('nearby labels rescue text from wrapping labels', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Search', inViewport: false, formState: { value: '' } }));
  });

  it('explicit aria-label wins over a nearby label', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'Explicit Aria', inViewport: false, formState: { checked: false } }));
    expect(entries.some((e) => e.type === 'checkbox' && e.description === 'Nearby Label')).toBe(false);
  });

  it('placeholder wins over a nearby label', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Type here', inViewport: false, formState: { value: '' } }));
    expect(entries.some((e) => e.type === 'textbox' && e.description === 'Nearby Placeholder Label')).toBe(false);
  });

  it('text-less controls get a positional index when no text is available', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    // The bare <input type="text"> has no label and no own attributes →
    // empty description with an index. It is #2 because the wrapping-label textbox
    // (Search) precedes it in document order among textboxes.
    expect(entries.some((e) => e.type === 'textbox' && e.description === null && e.index === 2)).toBe(true);
  });

  it('non-form text-less elements stay excluded', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    // Generic <h1> has text, but a bare <div> with no text must stay excluded.
    const divs = entries.filter((e) => e.type === 'element');
    expect(divs.every((e) => !e.description.startsWith('#'))).toBe(true);
  });

  it('form state is appended to form controls by default', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    // cb1 is unchecked by default.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', inViewport: false, formState: { checked: false } }));
    // sel1's first option has text, so it is the selected value.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', inViewport: false, formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%'] } }));
  });

  it('nearby labels + text-less + form state produce readable, stateful, complete entries', () => {
    const tree = getElementInventory();
    const entries = tree[0].elements;
    expect(entries).toContainEqual(expect.objectContaining({ type: 'checkbox', description: 'CheckBox in iFrame', inViewport: false, formState: { checked: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'radio', description: 'RadioButton 1', inViewport: false, formState: { set: false } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'dropdown', description: 'Select Dropdown', inViewport: false, formState: { selected: 'Please choose...', options: ['Please choose...', 'Set to 25%'] } }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'textbox', description: 'Search', inViewport: false, formState: { value: '' } }));
    expect(entries.some((e) => e.type === 'textbox' && e.description === null && e.index === 2)).toBe(true);
  });

  it('getElementDescriptor exposes nearby label', () => {
    const cb = document.getElementById('cb1');
    const d = getElementDescriptor(cb, true);
    expect(d.identifiableText).toBe('CheckBox in iFrame');
    expect(d.attributeName).toBe('label');
  });

  it('identified elements get an occurrence index within their (type, text) group', () => {
    // Two buttons with the same text ("Submit") and one with unique text
    // ("Cancel") must be indexed by (type, text) occurrence, not by type-only
    // position. The first "Submit" is #1, the second "Submit" is #2, and the
    // unique "Cancel" resets to #1.
    const scope = document.createElement('div');
    scope.innerHTML = `
      <button>Submit</button>
      <button>Cancel</button>
      <button>Submit</button>
    `;
    document.body.appendChild(scope);

    const tree = getElementInventory(scope);
    const entries = tree[0].elements.filter((e) => e.type === 'button');

    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', index: 1 }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Submit', index: 2 }));
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: 'Cancel', index: 1 }));

    document.body.removeChild(scope);
  });

  it('text-less controls keep the type-only positional #N index', () => {
    // A text-less button among identified buttons must still use the running
    // position among same-type elements (the #N fallback), not a (type, text)
    // occurrence index.
    const scope = document.createElement('div');
    scope.innerHTML = `
      <button>Submit</button>
      <button></button>
      <button>Cancel</button>
    `;
    document.body.appendChild(scope);

    const tree = getElementInventory(scope);
    const entries = tree[0].elements.filter((e) => e.type === 'button');

    // The text-less button is the 2nd button in document order → #N = 2.
    expect(entries).toContainEqual(expect.objectContaining({ type: 'button', description: null, index: 2 }));

    document.body.removeChild(scope);
  });
});
