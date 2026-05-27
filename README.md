# @nodebug/browser-element-finder

**A robust, agent-friendly JavaScript library for identifying DOM elements by type and/or text content, with full support for shadow DOM, iframes, and automation workflows.**

---

## Quickstart for Agents & Automation

Inject the library and find elements in any browser context (Selenium, Playwright, Puppeteer, or browser console):

```js
// Find all visible buttons
const results = ElementFinder.findElement('button')

// Find a button by text (substring match)
const results = ElementFinder.findElement('button', 'Submit')

// Find by text only (any type)
const results = ElementFinder.findElement(null, 'seleniumbase')

// Find in all frames (default)
const results = ElementFinder.findElement('button')

// Highlight found elements
ElementFinder.highlight(results.elements.map((e) => e.element))

// Remove highlight
ElementFinder.unhighlight(results.elements.map((e) => e.element))

// Check visibility
results.elements.forEach((e) => {
  console.log('Visible:', e.isVisible)
})
```

**Agent/Automation Best Practices**:

- Always check `frameIndex`: `-1` = main frame, `0+` = iframe (see below for iframe handling)
- For iframe results, switch context before interacting (see Selenium/Playwright docs)
- Use `getValidTypes()` to enumerate all supported semantic types
- Use `getSearchableAttributes()` to see which attributes are searched for text
- Check `isVisible` property to determine if an element is visible or hidden

---

## Features

- **Type-based element finding**: Find elements by semantic type (button, textbox, link, dropdown, etc.)
- **Text content search**: Search within element text, attributes, and placeholders
- **Shadow DOM support**: Automatically traverses shadow roots to find nested elements
- **Iframe support**: Automatically searches all frames (main document + iframes) by default
- **Visibility detection**: All elements returned with `isVisible` property (`true`/`false`)
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
│   ├── element-definitions.json  # XPath-like type definitions
│   └── searchable-attributes.json  # Attributes searched for text matching
├── tests/
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests with HTML fixtures
└── coverage/                       # Test coverage reports
```

## Usage Examples

### In Browser Console or Automation Script

```js
// Find all elements (visible and hidden)
const results = ElementFinder.findElement('button')
// Find by text
const results = ElementFinder.findElement('button', 'Submit')
// Find by text only
const results = ElementFinder.findElement(null, 'seleniumbase')
// Check visibility of found elements
results.elements.forEach((e) => {
  console.log('Visible:', e.isVisible)
})
```

## Working with Iframes (Agent Pattern)

The library automatically searches all frames (main + iframes). For agent/automation use:

- **Main frame**: `item.frameIndex === -1` and `item.element` is available for direct interaction.
- **Iframe**: `item.frameIndex >= 0` and `item.element` is `undefined`. Use `frameIndex` to switch context, then re-run `findElement` inside the iframe to get interactable elements.

**Example**:

```js
const results = ElementFinder.findElement('button')
for (const item of results.elements) {
  if (item.frameIndex === -1 && item.element) {
    // Interact directly
    item.element.click()
  } else if (item.frameIndex >= 0) {
    // Switch to iframe, then re-query
    // (agent/driver-specific code here)
  }
}
```

### Accessing Element Definitions and Searchable Attributes

The package exports JSON files containing element type definitions and searchable attributes:

```javascript
// ESM - Import JSON directly
import ELEMENT_DEFINITIONS from '@nodebug/browser-element-finder/element-definitions.json' assert { type: 'json' }
import SEARCHABLE_ATTRIBUTES from '@nodebug/browser-element-finder/searchable-attributes.json' assert { type: 'json' }

// Get all valid element types
console.log(Object.keys(ELEMENT_DEFINITIONS)) // ['button', 'checkbox', 'dropdown', ...]

// Get searchable attributes
console.log(SEARCHABLE_ATTRIBUTES) // ['placeholder', 'value', 'data-test-id', ...]
```

```javascript
// CommonJS - Use require
const ELEMENT_DEFINITIONS = require('@nodebug/browser-element-finder/element-definitions.json')
const SEARCHABLE_ATTRIBUTES = require('@nodebug/browser-element-finder/searchable-attributes.json')
```

---

## API Summary

| Function                                 | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| `findElement(type, text, exact, parent)` | Find elements by type/text, returns `{ elements: [...] }` |
| `highlight(elements, color, width)`      | Highlight elements with outline                           |
| `unhighlight(elements)`                  | Remove highlight                                          |
| `getValidTypes()`                        | List all supported element types                          |
| `getBoundingBox(element)`                | Get bounding box for an element                           |
| `setSearchableAttributes(attributes)`    | Set custom attributes for text search                     |
| `getSearchableAttributes()`              | Get current searchable attributes                         |
| `matchesType(el, type)`                  | Check if element matches a type                           |
| `matchesContent(el, value, exact)`       | Check if element matches text                             |
| `getAllElements(root)`                   | Get all elements (with shadow DOM)                        |
| `getAllFrames(root)`                     | Get all frames (main + iframes)                           |
| `parseXPath(expr, el, depth)`            | Parse XPath-like type expressions                         |
| `splitByOperator(expr, op)`              | Split XPath by operator                                   |

---

### `findElement(type, text, exact, parent)`

Finds elements matching the specified criteria. Searches all frames (main document + iframes) by default.

| Parameter | Type      | Default     | Description                                                                                           |
| --------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `type`    | `string`  | `"element"` | Element type (see supported types below). Must be a string; throws `TypeError` for non-string values. |
| `text`    | `string`  | `null`      | Text to search for in content/attributes                                                              |
| `exact`   | `boolean` | `false`     | Exact text match vs substring                                                                         |
| `parent`  | `Element` | `null`      | Parent element to search within                                                                       |

**Returns**: `{ elements: [{ element, boundingBox, tagName, frameIndex, isVisible }] }`

- `element`: Raw DOM element (main frame only; for iframes, use `frameIndex` and re-query after switching context)
- `frameIndex`: `-1` for main frame, `0, 1, 2...` for iframes
- `isVisible`: `true` if element is visible, `false` if hidden

**Agent/Automation Note**: Iframe elements cannot be interacted with directly. Use `frameIndex` to switch context, then re-run `findElement` inside the iframe.

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

### `matchesContent(el, value, exact)`

Checks if an element matches the specified text content. Safely handles edge case elements that may throw errors on attribute access.

### `getAllElements(root)`

Gets all elements including shadow DOM contents.

### `getAllFrames(root)`

Gets all frames (main document + iframes) in the window. Returns array with `frameIndex` (-1 for main, 0+ for iframes). Cross-origin iframes (SecurityError) are automatically skipped with a specific warning message, while other errors are logged separately.

### `parseXPath(expr, el, depth)`

Parses XPath-like expressions for element type matching. The `depth` parameter is used internally for recursion tracking and has a maximum limit of 100 to prevent stack overflow from deeply nested expressions.

### `splitByOperator(expr, op)`

Splits XPath expressions by operator (and/or).

---

## Working with Iframes

The library automatically searches all frames (main + iframes) by default. However, there are important limitations when working with iframe elements:

### Iframe Element Limitations

```javascript
const results = ElementFinder.findElement('button')

results.elements.forEach((item) => {
  if (item.frameIndex === -1) {
    // Main frame element - can interact directly
    console.log('Main frame element:', item.element)
    item.element.click() // Works
  } else {
    // Iframe element - element property is undefined
    console.log('Iframe element at frameIndex:', item.frameIndex)
    console.log('Bounding box:', item.boundingBox)
    // item.element is undefined - cannot interact directly
  }
})
```

### Interacting with Iframe Elements

To interact with elements inside an iframe, you must switch the Selenium driver context:

```javascript
// Find iframe elements
const results = await driver.executeScript(`
  return ElementFinder.findElement('button');
`)

// Switch to iframe and interact
const iframeElements = results.elements.filter((e) => e.frameIndex >= 0)
if (iframeElements.length > 0) {
  // Switch to the iframe (frameIndex 0 = first iframe)
  await driver.switchTo().frame(iframeElements[0].frameIndex)

  // Now find and interact with elements in the iframe
  const iframeResults = await driver.executeScript(`
    return ElementFinder.findElement('button');
  `)
  // These elements will have the element property since we're in the iframe context
}
```

---

## Supported Element Types

| Type         | Description                                             |
| ------------ | ------------------------------------------------------- |
| `button`     | `<button>`, `[role="button"]`, `[type="button"]`        |
| `checkbox`   | `<input type="checkbox">`, `[role="checkbox"]`          |
| `switch`     | Toggle switches, checkboxes with switch role            |
| `slider`     | `<input type="range">`, `[role="slider"]`               |
| `radio`      | `<input type="radio">`, `[role="radio"]`                |
| `dropdown`   | `<select>`, `[role="combobox"]`, `[role="listbox"]`     |
| `textbox`    | `<input>`, `<textarea>`, `[role="textbox"]`             |
| `link`       | `<a>`, `[role="link"]`, `[href]`                        |
| `heading`    | `<h1>-<h6>`, `[role="heading"]`                         |
| `navigation` | `<nav>`, `[role="navigation"]`                          |
| `list`       | `<ul>`, `<ol>`, `[role="list"]`                         |
| `listitem`   | `<li>`, `[role="listitem"]`                             |
| `menu`       | `<menu>`, `[role="menu"]`                               |
| `menuitem`   | `[role="menuitem"]`                                     |
| `toolbar`    | `[role="toolbar"]`                                      |
| `dialog`     | `[role="dialog"]`                                       |
| `table`      | `<table>`, `[role="table"]`                             |
| `row`        | `<tr>`, `[role="row"]`                                  |
| `column`     | `<td>`, `<th>`, `[role="cell"]`                         |
| `cell`       | `<td>`, `[role="cell"]` (data cells only, no expansion) |
| `image`      | `<img>`, `[role="img"]`                                 |
| `file`       | `<input type="file"]`                                   |
| `element`    | Matches all elements                                    |

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
const columnResult = ElementFinder.findElement('column', 'City')
// Returns: [th:City, td:New York, td:London, td:Paris]

// Find all cells when searching for a data cell value
const columnResult2 = ElementFinder.findElement('column', 'Paris')
// Returns: [th:City, td:New York, td:London, td:Paris]

// Find only the specific cell containing "Paris"
const cellResult = ElementFinder.findElement('cell', 'Paris')
// Returns: [td:Paris]

// Find by header text with cell type - returns only the header cell
const headerCell = ElementFinder.findElement('cell', 'City')
// Returns: [] (no td elements match "City" header text)
```

---

## Searchable Attributes

By default, the library searches these attributes (in priority order):

- `placeholder`, `value`, `data-test-id`, `data-testid`, `id`
- `resource-id`, `name`, `aria-label`, `class`, `hint`
- `title`, `tooltip`, `alt`, `src`, `aria-labelledby`

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
