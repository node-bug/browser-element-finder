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

// Find in all same-origin frames (iframe elements are returned without an `element` reference)
const results = ElementFinder.findElements({ type: 'button' })

// Find with fallback to nearby elements
const results = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Click Me',
})
// Returns button even if "Click Me" is in a nearby label

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

| Function                              | Description                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `findElements(options)`               | Find elements by type/text across all same-origin frames, returns `{ elements: [...] }`                   |
| `findElementsByType(options)`         | Find elements by type only across all same-origin frames, returns `{ elements: [...] }`                   |
| `findElementsByAttribute(options)`    | Find elements by text/attribute across all same-origin frames, returns `{ elements: [...] }`              |
| `findProbableElements(options)`       | Find elements with fallback to nearby elements, returns `{ elements: [...] }`                             |
| `highlight(elements, color, width)`   | Highlight elements with outline                                                                           |
| `unhighlight(elements)`               | Remove highlight                                                                                          |
| `pauseAnimations()`                   | Pause all CSS animations and transitions, returns state object                                            |
| `resumeAnimations(state)`             | Resume animations using state from `pauseAnimations()`                                                    |
| `getValidTypes()`                     | List all supported element types                                                                          |
| `getBoundingBox(element)`             | Get bounding box for an element                                                                           |
| `setSearchableAttributes(attributes)` | Set custom attributes for text search                                                                     |
| `getSearchableAttributes()`           | Get current searchable attributes                                                                         |
| `setIgnoredTags(tags)`                | Set tags to ignore during traversal                                                                       |
| `getIgnoredTags()`                    | Get current ignored tags                                                                                  |
| `addIgnoredTags(tags)`                | Add tags to the ignored list                                                                              |
| `removeIgnoredTags(tags)`             | Remove tags from the ignored list                                                                         |
| `matchesType(el, type)`               | Check if element matches a type                                                                           |
| `matchesAttribute(el, value, exact)`  | Check if element matches text/attribute                                                                   |
| `getAllElements(root)`                | Get all elements (with shadow DOM)                                                                        |
| `getAllFrames(root)`                  | Get all frames (main + iframes)                                                                           |
| `parseXPath(expr, el, depth)`         | Parse XPath-like type expressions                                                                         |
| `splitByOperator(expr, op)`           | Split XPath by operator                                                                                   |
| `inViewport(el, options)`             | Check if element intersects the visual viewport (sync)                                                    |
| `isHidden(el)`                        | Check if element is hidden (display:none, visibility:hidden, hidden attribute, inert, or zero dimensions) |

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

### `getBoundingBox(element)`

Returns the bounding box for an element.

### `setSearchableAttributes(attributes)`

Sets custom searchable attributes.

### `getSearchableAttributes()`

Returns the current searchable attributes array.

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
