# @nodebug/browser-element-finder

A standalone JavaScript library for identifying DOM elements by type and/or text content, with support for shadow DOM and iframes.

## Features

- **Type-based element finding**: Find elements by semantic type (button, textbox, link, dropdown, etc.)
- **Text content search**: Search within element text, attributes, and placeholders
- **Shadow DOM support**: Automatically traverses shadow roots to find nested elements
- **Iframe support**: Searches within iframes (same-origin)
- **Parent scoping**: Limit searches to a specific parent element
- **Visibility filtering**: Optionally include or exclude hidden elements
- **Bounding box data**: Returns position and dimensions for each found element

## Installation

```bash
npm install @nodebug/browser-element-finder
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

// Find links with specific text
const results = ElementFinder.findElement('link', 'seleniumbase')

// Find elements within a parent element
const parent = document.querySelector('.container')
const results = ElementFinder.findElement('button', null, false, false, parent)

// Include hidden elements
const results = ElementFinder.findElement('button', null, false, true)

// Highlight found elements
ElementFinder.highlight(results.elements)

// Remove highlighting
ElementFinder.unhighlight(results.elements)
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
```

## API Reference

### `findElement(type, text, exact, includeHidden, parent)`

Finds elements matching the specified criteria.

| Parameter       | Type      | Default | Description                              |
| --------------- | --------- | ------- | ---------------------------------------- |
| `type`          | `string`  | `null`  | Element type (see supported types below) |
| `text`          | `string`  | `null`  | Text to search for in content/attributes |
| `exact`         | `boolean` | `false` | Exact text match vs substring            |
| `includeHidden` | `boolean` | `false` | Include hidden elements                  |
| `parent`        | `Element` | `null`  | Parent element to search within          |

**Returns**: `{ elements: [{ element, boundingBox, tagName, frameIndex }] }`

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

## Supported Element Types

| Type       | Description                                         |
| ---------- | --------------------------------------------------- |
| `button`   | `<button>`, `[role="button"]`, `[type="button"]`    |
| `checkbox` | `<input type="checkbox">`, `[role="checkbox"]`      |
| `switch`   | Toggle switches, checkboxes with switch role        |
| `slider`   | `<input type="range">`, `[role="slider"]`           |
| `radio`    | `<input type="radio">`, `[role="radio"]`            |
| `dropdown` | `<select>`, `[role="combobox"]`, `[role="listbox"]` |
| `textbox`  | `<input>`, `<textarea>`, `[role="textbox"]`         |
| `link`     | `<a>`, `[role="link"]`, `[href]`                    |
| `heading`  | `<h1>-<h6>`, `[role="heading"]`                     |
| `list`     | `<ul>`, `<ol>`, `[role="list"]`                     |
| `listitem` | `<li>`, `[role="listitem"]`                         |
| `menu`     | `<menu>`, `[role="menu"]`                           |
| `menuitem` | `[role="menuitem"]`                                 |
| `toolbar`  | `[role="toolbar"]`                                  |
| `dialog`   | `[role="dialog"]`                                   |
| `table`    | `<table>`, `[role="table"]`                         |
| `row`      | `<tr>`, `[role="row"]`                              |
| `column`   | `<td>`, `<th>`, `[role="cell"]`                     |
| `image`    | `<img>`, `[role="img"]`                             |
| `file`     | `<input type="file">`                               |
| `element`  | Matches all elements                                |

## Searchable Attributes

By default, the library searches these attributes (in priority order):

- `placeholder`, `value`, `data-test-id`, `data-testid`, `id`
- `resource-id`, `name`, `aria-label`, `class`, `hint`
- `title`, `tooltip`, `alt`, `src`, `aria-labelledby`

## Development

### Running Tests

```bash
# Run Jest tests
npm test

# Run individual test files
node tests/test-dropdowns.js
node tests/test-switches.js
node tests/test-shadow-dom.js
node tests/test-element-finder-parent.js
node tests/test-forms.js
node tests/test-interactive-elements.js
node tests/test-tables.js
```

### Linting

```bash
npm run lint
```

## License

MIT
