# @nodebug/browser-element-finder

**Version**: 1.3.5

**A robust, agent-friendly JavaScript library for identifying DOM elements by type and/or text content, with full support for shadow DOM and automation workflows. Search results traverse all same-origin frames; elements inside iframes are returned with their `frameIndex` but without an `element` reference, because a DOM node cannot be serialized across the frame boundary.**

---

## Quickstart for Agents & Automation

Inject the library and find elements in any browser context (Selenium, Playwright, Puppeteer, or browser console):

```js
// Find all buttons (type-only search)
const results = ElementFinder.findElements({ type: 'button' })

// Find a button by text (substring match, combined type+text)
const results = ElementFinder.findElements({ type: 'button', text: 'Submit' })

// Find by text only (any type)
const results = ElementFinder.findElements({ text: 'seleniumbase' })

// Count semantic element types on the screen
const counts = ElementFinder.getElementCounts()
// Returns { button: { visible: 3, hidden: 0, total: 3 }, ... }

// Count one semantic type
const buttonCount = ElementFinder.getElementCounts({ type: 'button' })
// Returns `{ button: { visible: 3, hidden: 0, total: 3 } }`

// Find in all same-origin frames (iframe elements are returned without an `element` reference)
const results = ElementFinder.findElements({ type: 'button' })

// Find with fallback to nearby elements
const results = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Click Me',
})
// Returns button even if "Click Me" is in a nearby label

// Find overlay elements (modals, dialogs, cookie banners, popovers)
const overlays = ElementFinder.findOverlayElements()

// Find overlays at a specific point (e.g., where a click was intercepted)
const overlaysAtPoint = ElementFinder.findOverlayElements(100, 200)

// Highlight found elements
ElementFinder.highlight(results.elements.map((e) => e.element))

// Remove highlight
ElementFinder.unhighlight(results.elements.map((e) => e.element))

// Check element properties
results.elements.forEach((e) => {
  console.log('Tag:', e.tagName, 'Frame:', e.frameIndex)
})
```

**Agent/Automation Best Practices**:

- Results traverse all same-origin frames. Elements inside iframes are returned with their `frameIndex` (`0, 1, …`) but without an `element` reference, because a DOM node cannot be serialized across the frame boundary
- To get interactable `element` references for iframe contents, switch into the iframe context first, then run the finder inside that frame
- Use `getValidTypes()` to enumerate all supported semantic types
- Use `getSearchableAttributes()` to see which attributes are searched for text
- Use `getSearchableAttributeValues(element)` to inspect which searchable attributes are present on a specific element

---

## Features

- **Type-based element finding**: Find elements by semantic type (button, textbox, link, dropdown, etc.)
- **Text content search**: Search within element text, attributes, and placeholders
- **Shadow DOM support**: Automatically traverses shadow roots to find nested elements
- **Iframe support**: Traverses all same-origin frames; elements inside iframes are returned with their `frameIndex` but without an `element` reference, because a DOM node cannot be serialized across the frame boundary
- **Visibility detection**: All elements returned with `isHidden` property (`true`/`false`)
- **Bounding box data**: Returns position and dimensions for each found element
- **XPath-like type definitions**: Extensible element type matching using XPath-like expressions
- **Optimized performance**: Pre-compiled type matchers, O(n) innermost element filtering, and efficient Set-based lookups

## Performance Optimizations

The library includes several performance improvements:

- **Pre-compiled type matchers**: Type definitions are compiled into cached matcher functions at module load time, avoiding XPath re-parsing for every element
- **O(n) innermost element filtering**: Set-based lookups instead of nested loops
- **Map-based column expansion**: O(1) element-to-column-position lookups for table cells
- **Optimized text content matching**: Direct text node iteration instead of expensive textContent calls
- **Loop optimizations**: Traditional for-loops with cached array lengths for hot paths

## Installation

```bash
npm install @nodebug/browser-element-finder
```

## Project Structure

```
browser-element-finder/
├── src/
│   ├── element-finder.js          # Main canonical implementation (combined)
│   ├── element-definitions.json   # XPath-like type definitions
│   └── searchable-attributes.json # Attributes searched for text matching
├── scripts/
│   └── build.js                   # esbuild IIFE bundler for browser injection
├── tests/
│   ├── integration/               # Integration tests (Selenium + Chrome)
│   └── fixtures/                  # HTML test pages
├── index.js                       # Built IIFE bundle (browser entry point)
├── index.min.js                   # Minified IIFE bundle
└── coverage/                      # Test coverage reports
```

## Usage Examples

### In Browser Console or Automation Script

```js
// Find all elements (visible and hidden)
const results = ElementFinder.findElements({ type: 'button' })
// Find by type and text
const results = ElementFinder.findElements({ type: 'button', text: 'Submit' })
// Find by text only
const results = ElementFinder.findElements({ text: 'seleniumbase' })
// Count element types
const counts = ElementFinder.getElementCounts()
// Count one type
const buttonCount = ElementFinder.getElementCounts({ type: 'button' })
// Check visibility of found elements
results.elements.forEach((e) => {
  console.log('Hidden:', e.isHidden)
})
```

## Working with Iframes (Agent Pattern)

The library traverses **all same-origin frames**. Elements inside iframes **are** returned, but their `element` reference is `undefined` because a DOM node cannot be serialized across the frame boundary. To get interactable `element` references for iframe contents, switch into the iframe context first, then run the finder inside that frame.

- **Main frame**: `item.frameIndex === -1` and `item.element` is available for direct interaction.
- **Iframe**: iframe elements are returned with `frameIndex >= 0` and `item.element === undefined`. Switch context, then re-run the finder inside the iframe to get interactable elements.

**Example**:

```js
// Run inside the main document
const results = ElementFinder.findElements({ type: 'button' })
for (const item of results.elements) {
  if (item.frameIndex === -1 && item.element) {
    // Interact directly
    item.element.click()
  }
}

// To search inside an iframe, switch context first (driver-specific),
// then run the finder again within that frame.
```

### Customizing Searchable Attributes

You can customize which attributes the library searches for text (e.g., adding a custom `data-test-id` or removing `placeholder`).

```js
// Get current attributes
const currentAttrs = ElementFinder.getSearchableAttributes()

// Set new priority list
ElementFinder.setSearchableAttributes([
  'id',
  'name',
  'data-testid',
  'placeholder',
])
```

### Inspecting Attribute Values

Use `getSearchableAttributeValues(element)` to inspect which current searchable attributes are present on a specific element and what values they contain.

```js
const input = document.querySelector('input')
const values = ElementFinder.getSearchableAttributeValues(input)

console.log(values)
// { placeholder: 'Email', 'data-testid': 'email-input', id: 'email' }
```

The returned object only includes searchable attributes that exist on the element and have non-empty values. It respects any custom attribute order set with `setSearchableAttributes()`.

### Pausing Animations for Screenshots

When taking screenshots or performing visual assertions, animations can cause flaky tests. Use `pauseAnimations()` and `resumeAnimations()` to freeze and restore animations:

```js
// Pause all CSS animations and transitions
const pauseState = ElementFinder.pauseAnimations()

// Take screenshot or perform visual assertions
// ... screenshot code here ...

// Resume animations
ElementFinder.resumeAnimations(pauseState)
```

For Selenium WebDriver tests, call the functions directly in the browser context:

```js
// Pause animations (state is stored internally in browser)
await driver.executeScript('return ElementFinder.pauseAnimations()')

// ... take screenshot ...

// Resume animations (pops from internal stack - no argument needed)
await driver.executeScript('ElementFinder.resumeAnimations()')
```

### Accessing Element Definitions and Searchable Attributes

The package exports JSON files containing element type definitions and searchable attributes:

```javascript
// ESM - Import JSON directly
import ELEMENT_DEFINITIONS from '@nodebug/browser-element-finder/element-definitions.json' with { type: 'json' }
import SEARCHABLE_ATTRIBUTES from '@nodebug/browser-element-finder/searchable-attributes.json' with { type: 'json' }

// Get all valid element types
console.log(Object.keys(ELEMENT_DEFINITIONS)) // ['link', 'navigation', 'heading', 'button', ...]

// Get searchable attributes
console.log(SEARCHABLE_ATTRIBUTES) // ['name', 'aria-label', 'aria-labelledby', 'aria-placeholder', 'aria-valuetext', 'aria-description', 'placeholder', 'hint', 'title', 'tooltip', 'alt', 'data-value', 'data-test-id', 'data-testid', 'id', 'resource-id', 'src', 'value']
```

The package is ESM-only (`"type": "module"`), so CommonJS `require()` examples are not supported.

---

## API Summary

| Function                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findElements(options)`                        | Find elements by type/text across all same-origin frames, returns `{ elements: [...] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `findElementsByType(options)`                  | Find elements by type only across all same-origin frames, returns `{ elements: [...] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `findElementsByAttribute(options)`             | Find elements by text/attribute across all same-origin frames, returns `{ elements: [...] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `findOverlayElements(x, y)`                    | Find overlay/modal/dialog/banner elements across all same-origin frames (or at a point via `elementsFromPoint`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `getElementCounts(options)`                    | Count elements by semantic type and visibility, including generic `element` by default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `getViewportElementCounts(options)`            | Count visible elements currently in the viewport by semantic type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `findProbableElements(options)`                | Find elements with fallback to nearby elements, returns `{ elements: [...] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `highlight(elements, color, width)`            | Highlight elements with outline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `unhighlight(elements)`                        | Remove highlight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pauseAnimations()`                            | Pause all CSS animations and transitions, returns state object                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `resumeAnimations(state)`                      | Resume animations using state from `pauseAnimations()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `getValidTypes()`                              | List all supported element types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `getValidAttributes()`                         | List all valid searchable attribute names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `getBoundingBox(element)`                      | Get bounding box for an element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `setSearchableAttributes(attributes)`          | Set custom attributes for text search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `getSearchableAttributes()`                    | Get current searchable attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `setIgnoredTags(tags)`                         | Set tags to ignore during traversal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `getIgnoredTags()`                             | Get current ignored tags                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `addIgnoredTags(tags)`                         | Add tags to the ignored list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `removeIgnoredTags(tags)`                      | Remove tags from the ignored list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `getSearchableAttributeValues(element)`        | Get current non-empty searchable attribute values from an element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `getElementDescriptor(element, includeHidden)` | Get identifiable text, source attribute, occurrence index, type, tag name, and form state for an element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `getElementInventory(parent)`                  | Frame-grouped object snapshot `{type, description, inViewport, formState, index}`; each frame group also carries `overlay` (`{type, description, inViewport, formState, index}` of the visible overlay with the most inventory descendants, or `null`) — the same shape as a regular entry, with `index` mirroring that element's own entry index. Identified elements use a `(type, text)` occurrence `index`; text-less elements use the positional `#N`. Always-on text-less `#N` + form state + nearby-label rescue. Optional `parent` scopes the result to that element's descendants (single frame group) |
| `getFormState(el, type)`                       | Get the interactive state of a form control (value/checked/selected/on, etc.) for form semantic types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `matchesType(el, type)`                        | Check if element matches a type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `matchesAttribute(el, value, exact)`           | Check if element matches text/attribute                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `getAllElements(root)`                         | Get all elements (with shadow DOM)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `getAllFrames(root)`                           | Get all frames (main + iframes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `parseXPath(expr, el, depth)`                  | Parse XPath-like type expressions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `splitByOperator(expr, op)`                    | Split XPath by operator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `inViewport(el, options)`                      | Check if element intersects the visual viewport (sync)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `isHidden(el)`                                 | Check if element is hidden (display:none, visibility:hidden, hidden attribute, inert, or zero dimensions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

### Ignored Tags

Elements under ignored tags are skipped during traversal and are not matched by text search. By default, ignored tags are `SCRIPT`, `STYLE`, `TEMPLATE`, `NOSCRIPT`, and `HEAD`.

```javascript
ElementFinder.getIgnoredTags()
// ['HEAD', 'NOSCRIPT', 'SCRIPT', 'STYLE', 'TEMPLATE']

ElementFinder.addIgnoredTags(['META', 'LINK'])
ElementFinder.removeIgnoredTags(['TEMPLATE'])
ElementFinder.setIgnoredTags(['SCRIPT', 'STYLE'])
```

Tag names are case-insensitive.

---

### `findElements(options)`

Finds elements matching the specified type and/or text. Combines type and attribute matching in a single call. Traverses all same-origin frames (iframe elements are returned without an `element` reference).

| Parameter        | Type      | Default | Description                                                                                                                     |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `options.type`   | `string`  | `null`  | Element type (see supported types below). If `null` or `undefined`, matches any type. Throws `TypeError` for non-string values. |
| `options.text`   | `string`  | `''`    | Text to search for in content/attributes. If `null`/`''`/`undefined`, matches any text.                                         |
| `options.exact`  | `boolean` | `false` | Exact text match vs substring (only used when text is provided)                                                                 |
| `options.parent` | `Element` | `null`  | Parent element to search within                                                                                                 |

**Returns**: `{ elements: [{ element, boundingBox, tagName, frameIndex, isHidden, inViewport }] }`

- `element`: Raw DOM element for main-frame matches; `undefined` for iframe elements (cross-frame boundary)
- `frameIndex`: `-1` for main frame, `0+` for iframes
- `isHidden`: `true` if element is hidden (display:none, visibility:hidden, hidden attribute, inert, or zero dimensions)
- `inViewport`: `true` if any portion of the element intersects the visual viewport

**Agent/Automation Note**: Results traverse all same-origin frames. Elements inside iframes are returned with their `frameIndex` but without an `element` reference, because a DOM node cannot be serialized across the frame boundary. Switch into the iframe context and re-run the finder to get interactable `element` references for iframe contents.

### `findProbableElements(options)`

Finds elements matching the specified type with intelligent fallback to nearby elements. This function first attempts a direct match (element contains both type and text), then falls back to finding elements of the specified type near elements that match the text.

**Use Case**: When UI patterns separate content from interactive elements (e.g., a label with text "Email" next to an input field), `findProbableElements` will find the input even though the text isn't inside it.

| Parameter        | Type      | Default | Description                                                                                                                       |
| ---------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `options.type`   | `string`  | `null`  | Element type (see supported types below). If `null`/`undefined`/`''`, matches any type. Throws `TypeError` for non-string values. |
| `options.text`   | `string`  | `null`  | Text to search for in content/attributes. If `null`/`undefined`/`''`, matches any text. Throws `TypeError` for non-string values. |
| `options.exact`  | `boolean` | `false` | Exact text match vs substring (only used when text is provided)                                                                   |
| `options.parent` | `Element` | `null`  | Parent element to search within                                                                                                   |

**Returns**: `{ elements: [{ element, boundingBox, tagName, frameIndex, isHidden, inViewport }] }`

**Behavior**:

- If only `type` is provided: delegates to `findElements({ type, parent })`
- If only `text` is provided: delegates to `findElementsByAttribute({ value: text, exact, parent })`
- If both are provided: first attempts a strict combined match (element must satisfy BOTH type and text/attribute). If no direct match is found, falls back to finding elements of the specified type near elements that match the text.

**Fallback Strategy**: When no element matches both type and text directly, searches for nearby elements in this order:

1. Parent elements (walk up the DOM tree)
2. Sibling elements (same parent)
3. Child elements (descendants)

**Example**:

```javascript
// Type-only search (delegates to findElementsByType)
const result1 = ElementFinder.findProbableElements({ type: 'button' })
// Returns all buttons on the page

// Text-only search (delegates to findElementsByAttribute)
const result2 = ElementFinder.findProbableElements({ text: 'Submit' })
// Returns all elements containing "Submit"

// Direct match - element contains text
const result3 = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Submit',
})
// Returns button with text "Submit" inside it

// Fallback match - text in nearby element
const result4 = ElementFinder.findProbableElements({
  type: 'textbox',
  text: 'Email',
})
// Returns input element when "Email" text is in a nearby label

// Fallback match - text in parent
const result5 = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Menu Item 1',
})
// Returns button when "Menu Item 1" is in a child span
```

**When to use**:

- Use `findElements` when you need strict matching (element must contain the text)
- Use `findProbableElements` when text might be in a nearby element (labels, icons, wrappers)
- Both functions traverse all same-origin frames; iframe elements are returned without an `element` reference

### `highlight(elements, color, width)`

Highlights elements on the page with a colored outline.

| Parameter  | Type     | Default | Description             |
| ---------- | -------- | ------- | ----------------------- |
| `elements` | `Array`  | -       | Elements to highlight   |
| `color`    | `string` | `'red'` | Outline color           |
| `width`    | `number` | `3`     | Outline width in pixels |

### `unhighlight(elements)`

Removes highlighting from elements.

### `getValidTypes()`

Returns an array of all valid element type names.

### `getValidAttributes()`

Returns an array of all valid searchable attribute names (same as `getSearchableAttributes()`).

### `getBoundingBox(element)`

Returns the bounding box for an element.

### `setSearchableAttributes(attributes)`

Sets custom searchable attributes.

### `getSearchableAttributes()`

Returns the current searchable attributes array.

### `getElementDescriptor(element, includeHidden)`

Returns identifiable text for a DOM element, plus structured metadata about where it came from, its 1-based occurrence index, its semantic type, and its HTML tag name. Uniqueness is scoped to the combination of `type` and `identifiableText`, so a button labeled "Save" and a checkbox labeled "Save" each get their own independent index sequence.

```javascript
// Default: includes hidden elements in the index count
const descriptor = ElementFinder.getElementDescriptor(element)

// Exclude hidden elements from the index count
const descriptor = ElementFinder.getElementDescriptor(element, false)
```

| Parameter       | Type      | Default | Description                                                                                                                                                  |
| --------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `element`       | `Element` | -       | The DOM element to describe                                                                                                                                  |
| `includeHidden` | `boolean` | `true`  | Whether to include hidden elements when computing the occurrence index. Default `true` includes all elements. Set to `false` to count only visible elements. |

**Returns**:

```javascript
{
  identifiableText: 'Save', // Plain searchable text only; no CSS/XPath/index syntax
  attributeName: 'title',   // Attribute name, or 'text' for direct/textContent fallback
  index: 2,                 // 1-based occurrence index within (type, identifiableText); index > 1 means not unique
  type: 'button',           // Semantic element type, or null for non-elements
  tagName: 'button',        // Lowercase HTML tag name, or null for non-elements
  formState: undefined      // Form control state for form types (see getFormState); undefined for non-form types
}
```

**Index semantics**:

- `index` is the 1-based count of elements in the current frame that share the same `type` AND the same `identifiableText`. Two elements with the same descriptor text but different semantic types each get `index: 1`.
- When an element has no identifiable text (`identifiableText: null`), `index` falls back to the element's 1-based position among elements of the same `type` in the frame.
- By default, hidden elements are included in the index count. Use `{ includeHidden: false }` to count only visible elements.

**Examples**:

```javascript
// Two buttons with title "Save" -> indices 1, 2 (button type, shared text)
button1.getElementDescriptor(...) // { index: 1, type: 'button', identifiableText: 'Save', ... }
button2.getElementDescriptor(...) // { index: 2, type: 'button', identifiableText: 'Save', ... }

// Button and checkbox with same text -> both index 1 (different types)
button.getElementDescriptor(...)   // { index: 1, type: 'button',   identifiableText: 'Submit', ... }
checkbox.getElementDescriptor(...) // { index: 1, type: 'checkbox', identifiableText: 'Submit', ... }

// Textless buttons -> indices reflect position among same-type elements
btn1.getElementDescriptor(...) // { index: 1, type: 'button', identifiableText: null, ... }
btn2.getElementDescriptor(...) // { index: 2, type: 'button', identifiableText: null, ... }

// Exclude hidden elements from the count
descriptor = ElementFinder.getElementDescriptor(element, false)
```

Descriptor selection prioritizes an element's own direct text over searchable attributes:

1. Direct text nodes are used first and `attributeName` is set to `'text'`. (Text is shortened to the first line and capped at `MAX_IDENTIFIABLE_TEXT_LENGTH` characters without cutting words.)
2. If no direct text exists (or the element is an ignored tag such as `script`/`style`), the first non-empty searchable attribute value is used instead.
3. `aria-labelledby` is resolved to referenced element text before returning the identifiable text.
4. `src` values are returned as the image filename without path, query string, fragment, or extension.
5. If no text and no searchable attribute exists, `identifiableText` and `attributeName` are `null`, and `index` falls back to the element's 1-based position among elements of the same `type` in the frame.

Null or non-element input returns:

```javascript
{
  identifiableText: null,
  attributeName: null,
  index: 1,
  type: null,
  tagName: null,
  formState: undefined
}
```

### `getFormState(el, type)`

Captures the current interactive state of a form control so form actions can be replayed or inspected. Only form semantic types produce a `formState`; for all other types this returns `undefined`. Reads are defensive — a control without a usable value (e.g. a detached element) yields an empty/neutral state rather than throwing.

The shape is keyed by semantic type:

- `textbox` / `colorpicker` / `datepicker`: `{ value: string }`
- `checkbox`: `{ checked: boolean }`
- `radio`: `{ set: boolean }`
- `switch`: `{ on: boolean }`
- `dropdown`: `{ selected: string|null, options: string[] }`
- `slider`: `{ value: number }`
- `file`: `{ fileName: string|null }`

```javascript
const state = ElementFinder.getFormState(inputEl, 'textbox')
// { value: 'hello' }

const checkboxState = ElementFinder.getFormState(checkboxEl, 'checkbox')
// { checked: true }
```

### `getElementInventory(parent)`

Captures a compact, frame-grouped snapshot of identifiable elements for state capture and guided interaction. Each element is an object with its semantic `type`, an identifiable `description`, a `boundingBox`, an `inViewport` flag, its `formState` (or `null`), and an `index`. For **identified** elements (those with text), `index` is the 1-based occurrence within their `(type, text)` group (the first "Submit" is `1`, the second "Submit" is `2`, a uniquely-named element resets to `1`) — matching `getElementDescriptor`. For **text-less** elements, `index` is the positional `#N` (1-based position among same-type elements in the frame). The complete page is returned (no viewport filtering) — every element carries an `inViewport` boolean so callers can filter if they wish. Hidden elements are included (no visibility filtering), and cross-origin iframes are silently skipped.

Text-less elements and form state are **always** included:

- A text-less element of any real semantic type (all types except `element`/`iframe`) with no identifiable text is emitted as `type:#N` (N = 1-based position among same-type elements in the frame).
- A `formState` object is attached to every form control (see `getFormState`).

```javascript
// Full-page tree: each element is an object with an inViewport flag
const tree = ElementFinder.getElementInventory()
// [ { frame: -1, elements: [
//   { type: 'button',   description: 'Submit', index: 1, inViewport: true,  formState: null },
//   { type: 'textbox',  description: 'email',  index: 1, inViewport: true,  formState: { value: '' } },
//   { type: 'checkbox', description: 'pref',   index: 1, inViewport: false, formState: { checked: false } },
//   { type: 'textbox',  description: null,     index: 2, inViewport: false, formState: { value: '' } }  // anonymous control, positional #N index
// ] } ]

// Scoped to a parent's subtree: only the parent's descendants (excluding the
// parent itself) are returned, in a single frame group for that frame.
const subtree = ElementFinder.getElementInventory(
  document.getElementById('my-section'),
)
// [ { frame: -1, elements: [ /* only descendants of #my-section */ ] } ]
```

**Key behaviors**:

- Optional `parent` (an `Element`): when provided, only that element's descendants are returned (the parent itself is excluded), grouped into a single frame group for the frame the parent lives in. The `#N` positional index is computed relative to that subtree (reset per call), matching `findElements()` ordering within the scope. This mirrors how `findElements(options)` treats `options.parent` as a search root.
- Scoped mode does **not** recurse into same-origin iframes inside the parent's subtree — it returns only the light-DOM + shadow-DOM descendants of the parent in that frame. Use full-page mode (no `parent`) to traverse all frames.
- When called with no argument, always returns the complete page across all same-origin frames.
- Main document is `frame: -1`, iframes `0, 1, …`.
- Nearby-label rescue is always on: text from a nearby `<label>` overrides machine attributes (`value`/`id`/`resource-id`/`name`/`src`/`data-test-id`/`data-testid`/`data-value`) for form controls, but yields to explicit a11y/semantic text (`aria-label`/`aria-labelledby`, `placeholder`, `data-*`).
- Text-less promotion applies to all real semantic types (everything except `iframe` and `element`, per `TEXTLESS_TYPES`) — not just form controls; generic containers are never promoted as inventory entries. `#N` is session-stable but not durable across DOM mutations.
- Identified elements use a `(type, text)` occurrence `index` (1-based within their group), so the first "Submit" is `1`, the second "Submit" is `2`, and a uniquely-named element resets to `1`. This matches `getElementDescriptor`. Text-less elements use the positional `#N` `index`.
- **Overlay detection for text-less containers**: Even though generic containers (`element` type) are excluded from inventory entries, they are still considered as overlay candidates. A `<div class="modal">` with no `id`, no `aria-label`, and no own text will be detected as the dominant overlay if it contains the most inventory descendants. The reported `overlay` object carries `description: null` in this case.
- **Frame resolution for scoped parents**: when a parent element lives inside a nested iframe (an iframe within an iframe), frame resolution walks up the ancestor chain (including shadow-DOM hosts) to find a matching frame, rather than defaulting to `-1`.

### `matchesType(el, type)`

Checks if an element matches the specified type definition.

### `matchesAttribute(el, value, exact)`

Checks if an element matches the specified text/attribute value. Safely handles edge case elements that may throw errors on attribute access.

### `findElementsByType(options)`

Finds elements by type only. Traverses all same-origin frames (iframe elements are returned without an `element` reference).

| Parameter        | Type      | Default     | Description                                                                         |
| ---------------- | --------- | ----------- | ----------------------------------------------------------------------------------- |
| `options.type`   | `string`  | `"element"` | Element type (see supported types below). Throws `TypeError` for non-string values. |
| `options.parent` | `Element` | `null`      | Parent element to search within                                                     |

### `getElementCounts(options)`

Counts elements by semantic type and visibility on the current screen. Traverses all same-origin frames (iframe elements are counted but have no `element` reference).

| Parameter        | Type      | Default | Description                                                                                  |
| ---------------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| `options.type`   | `string`  | `null`  | Specific element type to count. If `null`/`undefined`, returns counts for all defined types. |
| `options.parent` | `Element` | `null`  | Parent element to count within                                                               |

**Returns**: `Object.<string, { visible: number, hidden: number, total: number }>` keyed by semantic element type.

```javascript
// Count all defined types
const counts = ElementFinder.getElementCounts()
// { element: { visible: 98, hidden: 6, total: 104 }, button: { visible: 3, hidden: 0, total: 3 }, textbox: { visible: 2, hidden: 0, total: 2 }, ... }

// Count one type
const buttons = ElementFinder.getElementCounts({ type: 'button' })
// { button: { visible: 3, hidden: 0, total: 3 } }

// Count within a parent element
const inputs = ElementFinder.getElementCounts({
  type: 'textbox',
  parent: document.querySelector('form'),
})
// { textbox: { visible: 2, hidden: 0, total: 2 } }
```

The generic `element` type is included in the all-types count, so the result contains both the catch-all `element` count and semantic types such as `button`, `textbox`, `link`, and `table`.

### `getViewportElementCounts(options)`

Counts elements by semantic type that are currently visible **within the browser viewport**. This is useful for determining which elements a user can actually see on screen without scrolling. Traverses all same-origin frames (iframe elements are counted but have no `element` reference).

| Parameter        | Type      | Default | Description                                                                                  |
| ---------------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| `options.type`   | `string`  | `null`  | Specific element type to count. If `null`/`undefined`, returns counts for all defined types. |
| `options.parent` | `Element` | `null`  | Parent element to count within                                                               |

**Returns**: `Object.<string, { visible: number, hidden: number, total: number }>` keyed by semantic element type.

```javascript
// Count all defined types in the viewport
const counts = ElementFinder.getViewportElementCounts()
// { button: { visible: 2, hidden: 0, total: 2 }, textbox: { visible: 1, hidden: 0, total: 1 }, ... }

// Count one type in the viewport
const buttons = ElementFinder.getViewportElementCounts({ type: 'button' })
// { button: { visible: 2, hidden: 0, total: 2 } }

// Count within a parent element
const inputs = ElementFinder.getViewportElementCounts({
  type: 'textbox',
  parent: document.querySelector('form'),
})
// { textbox: { visible: 1, hidden: 0, total: 1 } }
```

The `total` count represents all elements within the viewport (visible + hidden). Elements outside the viewport are excluded entirely.

### `findElementsByAttribute(options)`

Finds elements by text/attribute value only. Traverses all same-origin frames (iframe elements are returned without an `element` reference).

| Parameter        | Type      | Default | Description                                                                                        |
| ---------------- | --------- | ------- | -------------------------------------------------------------------------------------------------- |
| `options.value`  | `string`  | `''`    | Text/attribute value to search for. If `null`/`undefined`, defaults to empty string (matches all). |
| `options.exact`  | `boolean` | `false` | Exact text match vs substring                                                                      |
| `options.parent` | `Element` | `null`  | Parent element to search within                                                                    |

### `getAllElements(root)`

Gets all elements including shadow DOM contents.

### `getAllFrames(root)`

Gets all frames (main document + iframes) in the window. Returns array with `frameIndex` (-1 for main, 0+ for iframes). Cross-origin iframes (SecurityError) are automatically skipped with a specific warning message, while other errors are logged separately.

### `inViewport(el, options)`

Checks if an element intersects the visual viewport. Uses synchronous geometry checks via `getBoundingClientRect()` against window dimensions.

| Parameter              | Type      | Default | Description                                                                           |
| ---------------------- | --------- | ------- | ------------------------------------------------------------------------------------- |
| `el`                   | `Element` | -       | The DOM element to check                                                              |
| `options`              | `Object`  | `null`  | Optional configuration object                                                         |
| `options.fullyVisible` | `boolean` | `false` | If true, requires the element to be fully contained within the viewport (no clipping) |
| `options.threshold`    | `number`  | `0`     | Minimum intersection ratio (0-1) required to count as in viewport                     |

**Returns**: `boolean` - `true` if the element intersects the viewport.

```javascript
// Check if element is in viewport (partial overlap OK)
const isInViewport = ElementFinder.inViewport(element)

// Check if element is fully visible (no clipping)
const isFullyVisible = ElementFinder.inViewport(element, { fullyVisible: true })

// Check if at least 50% of element is visible
const isHalfVisible = ElementFinder.inViewport(element, { threshold: 0.5 })
```

### `parseXPath(expr, el, depth)`

Parses XPath-like expressions for element type matching. The `depth` parameter is used internally for recursion tracking and has a maximum limit of 100 to prevent stack overflow from deeply nested expressions.

### `splitByOperator(expr, op)`

Splits XPath expressions by operator (and/or).

---

## Working with Iframes

The library traverses **all same-origin frames**. Elements inside iframes **are** returned, but their `element` reference is `undefined` because a DOM node cannot be serialized across the frame boundary. To get interactable `element` references for iframe contents, switch into the iframe context first, then run the finder inside that frame.

### Iframe Element Results

```javascript
const results = ElementFinder.findElements({ type: 'button' })

// results.elements contains main-frame AND iframe elements.
// iframe elements have frameIndex >= 0 and no element reference.
results.elements.forEach((item) => {
  if (item.frameIndex === -1 && item.element) {
    // Main frame element - can interact directly
    console.log('Main frame element:', item.element)
    item.element.click() // Works
  } else {
    // Iframe element - switch context to interact
    console.log('Iframe element at frameIndex:', item.frameIndex)
  }
})
```

### Interacting with Iframe Elements

To interact with elements inside an iframe, you must switch the Selenium driver context:

```javascript
// Find elements across all frames (main + iframes)
const results = await driver.executeScript(`
  return ElementFinder.findElements({ type: 'button' });
`)

// Switch to the iframe, then run the finder again inside that frame
await driver.switchTo().frame(0) // first iframe

const iframeResults = await driver.executeScript(`
  return ElementFinder.findElements({ type: 'button' });
`)
// These elements will have the element property since we're in the iframe context
```

---

## Supported Element Types

| Type          | Description                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `button`      | `<button>`, `[role="button"]`, `[type="button"]`, `[type="submit"]`                                  |
| `checkbox`    | `<input type="checkbox">`, `[role="checkbox"]`                                                       |
| `switch`      | Toggle switches, checkboxes with switch role, buttons with `class="switch"` or `data-state`          |
| `slider`      | `<input type="range">`, `[role="slider"]`                                                            |
| `datepicker`  | `<input type="date">`, `[role="date"]`                                                               |
| `colorpicker` | `<input type="color">`, `[role="color"]`                                                             |
| `radio`       | `<input type="radio">`, `[role="radio"]`                                                             |
| `dropdown`    | `<select>`, `[role="combobox"]`, `[role="listbox"]`, class-based dropdown/trigger, ancestor matching |
| `textbox`     | `<textarea>`, `<input>` (text/password/search/email/number/tel/url), `[role="textbox"]`              |
| `link`        | `<a>`, `[role="link"]`, `[href]`                                                                     |
| `heading`     | `<h1>-<h6>`, `[role="heading"]`                                                                      |
| `navigation`  | `<nav>`, `[role="navigation"]`                                                                       |
| `list`        | `<ul>`, `<ol>`, `[role="list"]`                                                                      |
| `listitem`    | `<li>`, `[role="listitem"]`                                                                          |
| `menu`        | `<menu>`, `[role="menu"]`                                                                            |
| `menuitem`    | `[role="menuitem"]`                                                                                  |
| `toolbar`     | `[role="toolbar"]`                                                                                   |
| `dialog`      | `[role="dialog"]`, `[role="alertdialog"]`                                                            |
| `table`       | `<table>`, `[role="table"]`                                                                          |
| `row`         | `<tr>`, `[role="row"]`                                                                               |
| `column`      | `<td>`, `<th>`, `[role="cell"]`, `[role="gridcell"]`, `[role="columnheader"]`                        |
| `cell`        | `<td>`, `[role="cell"]`, `[role="gridcell"]` (data cells only, no expansion)                         |
| `image`       | `<img>`, `[role="img"]`, `[alt]`                                                                     |
| `file`        | `<input type="file">`                                                                                |
| `element`     | Matches all elements                                                                                 |

---

## Table Element Types: `column` vs `cell`

Both `column` and `cell` types find table cells, but they behave differently:

| Type     | Matches                 | With Text Search                                          |
| -------- | ----------------------- | --------------------------------------------------------- |
| `column` | `<td>`, `<th>` elements | Returns **all cells** in the column (header + data cells) |
| `cell`   | `<td>` elements only    | Returns **only the specific cell** (no expansion)         |

**Example**:

```javascript
// Find all cells in the "City" column (header + 3 data cells = 4 total)
const columnResult = ElementFinder.findElements({
  type: 'column',
  text: 'City',
})
// Returns: [th:City, td:New York, td:London, td:Paris]

// Find all cells when searching for a data cell value
const columnResult2 = ElementFinder.findElements({
  type: 'column',
  text: 'Paris',
})
// Returns: [th:City, td:New York, td:London, td:Paris]

// Find only the specific cell containing "Paris"
const cellResult = ElementFinder.findElements({ type: 'cell', text: 'Paris' })
// Returns: [td:Paris]

// Find by header text with cell type - returns only the header cell
const headerCell = ElementFinder.findElements('cell', 'City')
// Returns: [] (no td elements match "City" header text)
```

---

## Searchable Attributes

By default, the library searches these attributes (in priority order):

- `name`, `aria-label`, `aria-labelledby`, `aria-placeholder`, `aria-valuetext`, `aria-description`
- `placeholder`, `hint`, `title`, `tooltip`, `alt`, `data-value`, `data-test-id`, `data-testid`
- `id`, `resource-id`, `src`, `value`

---

## Performance

The library is optimized for large DOM trees with efficient algorithms:

- **Pre-compiled type matchers**: Type definitions are compiled into cached matcher functions at module load time
- **O(n) innermost element filtering**: Set-based lookups instead of O(n²) nested loops
- **Map-based column expansion**: O(1) element-to-column-position lookups for table cells
- **Optimized text matching**: Direct text node iteration avoids expensive textContent calls
- **Loop optimizations**: Traditional for-loops with cached lengths for hot paths

---

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Note**: The `tests/integration/helpers/` folder is excluded from vitest runs as it contains helper utilities.

### Linting

```bash
npm run lint
```

### Code Coverage

The library includes a Node.js-compatible module (`src/element-finder.js`) that provides the same functionality as the browser-injected `index.js` for coverage testing. This module is fully covered by unit tests.

The original `index.js` is browser-injected code executed via Selenium's `executeScript`. Coverage for browser-injected code requires browser-based tools like Istanbul or running tests in a browser environment.

---

## License

MIT
