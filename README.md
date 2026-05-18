# @nodebug/browser-element-finder

A standalone JavaScript library for identifying DOM elements by type and/or text content, with support for shadow DOM. Designed for browser automation, testing, and debugging workflows.

## Features

- **Type-based element finding**: Find elements by semantic type (button, textbox, link, dropdown, etc.)
- **Text content search**: Search within element text, attributes, and placeholders
- **Shadow DOM support**: Automatically traverses shadow roots to find nested elements
- **Iframe support**: Automatically searches all frames (main document + iframes) by default
- **Visibility filtering**: Optionally include or exclude hidden elements
- **Bounding box data**: Returns position and dimensions for each found element
- **XPath-like type definitions**: Extensible element type matching using XPath-like expressions

## Installation

```bash
npm install @nodebug/browser-element-finder
```

## Project Structure

```
browser-element-finder/
├── index.js                      # Browser-injected library (generated)
├── build.js                      # Build script to generate index.js
├── src/
│   ├── element-finder.js         # Canonical source (ES module)
│   ├── element-definitions.json  # XPath-like type definitions
│   └── searchable-attributes.json  # Attributes searched for text matching
├── tests/
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests with HTML fixtures
└── coverage/                       # Test coverage reports
```

## Usage

### In Browser Console

```javascript
// Find all buttons
const results = ElementFinder.findElement('button')

// Find buttons with specific text
const results = ElementFinder.findElement('button', 'Submit')

// Find elements by text only
const results = ElementFinder.findElement(null, 'seleniumbase')

// Find elements in iframes (searches all frames by default)
const results = ElementFinder.findElement('button')
results.elements.forEach((item) => {
  console.log('Frame index:', item.frameIndex) // -1 for main, 0+ for iframes
  if (item.element) {
    console.log('Can interact with element directly')
  } else {
    console.log('Iframe element - use elementData for metadata')
  }
})

// Find links with specific text
const results = ElementFinder.findElement('link', 'seleniumbase')

// Include hidden elements
const results = ElementFinder.findElement('button', null, false, true)

// Find elements within a parent element
const parent = document.querySelector('#container')
const results = ElementFinder.findElement('button', null, false, false, parent)

// Access metadata from results
results.elements.forEach((item) => {
  console.log('Tag:', item.tagName)
  console.log('Position:', item.boundingBox.x, item.boundingBox.y)
})

// Highlight found elements (extract DOM elements from wrapper objects)
ElementFinder.highlight(results.elements.map((e) => e.element))

// Remove highlighting
ElementFinder.unhighlight(results.elements.map((e) => e.element))
```

### With Selenium WebDriver

```javascript
import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { readFileSync } from 'fs'

// Inject the library into the browser
const finderCode = readFileSync('./index.js', 'utf8')
await driver.executeScript(`${finderCode}`)

// Find elements
const results = await driver.executeScript(`
  return ElementFinder.findElement('button', 'Submit');
`)

// Access metadata directly from the result object
results.elements.forEach((item) => {
  console.log('Tag:', item.tagName)
  console.log('Position:', item.boundingBox.x, item.boundingBox.y)
})

// Use the element with Selenium WebElement methods
if (results.elements.length > 0) {
  const element = results.elements[0].element
  const tagName = await element.getTagName()
  await element.click()
}
```

### As an ES Module

```javascript
import {
  findElement,
  highlight,
  getValidTypes,
} from '@nodebug/browser-element-finder/src/element-finder.js'

// Find elements (requires DOM environment)
const results = findElement('button', 'Submit')

// Access metadata from results
results.elements.forEach((item) => {
  console.log('Tag:', item.tagName)
  console.log('Position:', item.boundingBox.x, item.boundingBox.y)
})

// Highlight elements (extract DOM elements from wrapper objects)
highlight(results.elements.map((e) => e.element))
```

## API Reference

### `findElement(type, text, exact, includeHidden, parent)`

Finds elements matching the specified criteria. Searches all frames (main document + iframes) by default.

| Parameter       | Type      | Default     | Description                              |
| --------------- | --------- | ----------- | ---------------------------------------- |
| `type`          | `string`  | `"element"` | Element type (see supported types below) |
| `text`          | `string`  | `null`      | Text to search for in content/attributes |
| `exact`         | `boolean` | `false`     | Exact text match vs substring            |
| `includeHidden` | `boolean` | `false`     | Include hidden elements                  |
| `parent`        | `Element` | `null`      | Parent element to search within          |

**Returns**: `{ elements: [{ element, boundingBox, tagName, frameIndex }] }`

- `element`: Raw DOM element (only available for main frame elements; iframe elements return `undefined`)
- `frameIndex`: `-1` for main frame, `0, 1, 2...` for iframes

**Important**: Iframe elements are found and their bounding boxes are returned, but the raw DOM element is NOT included because DOM elements cannot be serialized across frame boundaries. To interact with iframe elements, you must switch the Selenium driver context to the iframe first using `driver.switchTo().frame()`.

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

Checks if an element matches the specified text content.

### `getAllElements(root)`

Gets all elements including shadow DOM contents.

### `getAllFrames(root)`

Gets all frames (main document + iframes) in the window. Returns array with `frameIndex` (-1 for main, 0+ for iframes).

### `getConfig()`

Returns the current configuration object.

### `parseXPath(expr, el)`

Parses XPath-like expressions for element type matching.

### `splitByOperator(expr, op)`

Splits XPath expressions by operator (and/or).

## Working with Iframes

The library automatically searches all frames (main document + iframes) by default. However, there are important limitations when working with iframe elements:

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

## Supported Element Types

| Type         | Description                                         |
| ------------ | --------------------------------------------------- |
| `button`     | `<button>`, `[role="button"]`, `[type="button"]`    |
| `checkbox`   | `<input type="checkbox">`, `[role="checkbox"]`      |
| `switch`     | Toggle switches, checkboxes with switch role        |
| `slider`     | `<input type="range">`, `[role="slider"]`           |
| `radio`      | `<input type="radio">`, `[role="radio"]`            |
| `dropdown`   | `<select>`, `[role="combobox"]`, `[role="listbox"]` |
| `textbox`    | `<input>`, `<textarea>`, `[role="textbox"]`         |
| `link`       | `<a>`, `[role="link"]`, `[href]`                    |
| `heading`    | `<h1>-<h6>`, `[role="heading"]`                     |
| `navigation` | `<nav>`, `[role="navigation"]`                      |
| `list`       | `<ul>`, `<ol>`, `[role="list"]`                     |
| `listitem`   | `<li>`, `[role="listitem"]`                         |
| `menu`       | `<menu>`, `[role="menu"]`                           |
| `menuitem`   | `[role="menuitem"]`                                 |
| `toolbar`    | `[role="toolbar"]`                                  |
| `dialog`     | `[role="dialog"]`                                   |
| `table`      | `<table>`, `[role="table"]`                         |
| `row`        | `<tr>`, `[role="row"]`                              |
| `column`     | `<td>`, `<th>`, `[role="cell"]`                     |
| `image`      | `<img>`, `[role="img"]`                             |
| `file`       | `<input type="file"]`                               |
| `element`    | Matches all elements                                |

## Searchable Attributes

By default, the library searches these attributes (in priority order):

- `placeholder`, `value`, `data-test-id`, `data-testid`, `id`
- `resource-id`, `name`, `aria-label`, `class`, `hint`
- `title`, `tooltip`, `alt`, `src`, `aria-labelledby`

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

**Note:** The `tests/integration/helpers/` folder is excluded from vitest runs as it contains helper utilities r

### Linting

```bash
npm run lint
```

### Code Coverage

The library includes a Node.js-compatible module (`src/element-finder.js`) that provides the same functionality as the browser-injected `index.js` for coverage testing. This module is fully covered by unit tests.

The original `index.js` is browser-injected code executed via Selenium's `executeScript`. Coverage for browser-injected code requires browser-based tools like Istanbul or running tests in a browser environment.

## License

MIT
