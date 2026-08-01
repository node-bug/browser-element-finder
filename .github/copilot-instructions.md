# @nodebug/browser-element-finder

## Project Overview

A robust, agent-friendly JavaScript library for identifying DOM elements by semantic type and/or text content, with full support for shadow DOM, iframes, and browser automation workflows (Selenium, Playwright, Puppeteer).

**Repository**: `@nodebug/browser-element-finder` on npm
**Version**: 1.4.0
**Node**: >= 24
**Module System**: ESM-only (`"type": "module"`)

## Architecture

Dual-module source design with four IIFE build outputs:

```
┌─────────────────────────────────────────────────────┐
│              Browser Runtime (IIFE Bundles)          │
│  index.js, index.min.js → ElementFinder global      │
│  inventory.js, inventory.min.js → ElementInventory   │
│  • Built by esbuild from src/ modules               │
│  • Injected via executeScript in Selenium/CDP       │
│  • Inventory requires Finder to be loaded first     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│           Canonical Module (src/element-finder.js)   │
│  • Combined type + attribute search                 │
│  • XPath-like type matching engine                  │
│  • Attribute priority-based text search             │
│  • Shadow DOM & iframe traversal                    │
│  • Probable element fallback logic                  │
└─────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│       Inventory Module (src/element-inventory.js)    │
│  • Imports shared helpers from finder module        │
│  • Generates flat JSON-serializable DOM inventory   │
│  • 6-tier identifiable text hierarchy               │
│  • Semantic type, bounding box, visibility per elem │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
browser-element-finder/
├── index.js                      # Built Finder IIFE bundle (browser entry point)
├── index.min.js                  # Minified Finder IIFE bundle
├── inventory.js                  # Built Inventory IIFE bundle
├── inventory.min.js              # Minified Inventory IIFE bundle
├── build.js                      # esbuild configuration script
├── demo.js                       # Interactive Selenium demo script
├── package.json                  # ESM, Node >= 24, Vitest + ESLint tooling
├── vitest.config.js              # Test configuration (maxWorkers: 2 for serial integration)
├── eslint.config.js              # Linting configuration (@eslint/js + prettier)
├── ENGINEERING.md                # Comprehensive technical reference
├── TODO.md                       # Feature roadmap & completed optimizations
│
├── src/                          # Source modules
│   ├── element-finder.js         # Main canonical finder implementation (combined)
│   ├── element-inventory.js      # DOM inventory generator
│   ├── element-definitions.json  # XPath-like type → expression mapping
│   └── searchable-attributes.json # Attribute search priority list
│
├── tests/                        # Vitest test suite
│   ├── integration/              # Real browser Selenium tests
│   │   ├── animations.test.js        # pauseAnimations/resumeAnimations
│   │   ├── attributes.test.js        # Attribute matching logic
│   │   ├── edge-cases.test.js        # Null input, cross-frame, etc.
│   │   ├── find-elements.test.js     # Combined type + attribute search
│   │   ├── inventory.test.js         # Inventory integration tests
│   │   ├── inventory-unit.test.js    # Inventory unit-style tests
│   │   ├── types.test.js             # Type matching & XPath parsing
│   │   ├── viewport.test.js          # inViewport tests
│   │   ├── dropdowns.test.js         # Dropdown search tests
│   │   ├── element-types.test.js     # Element type search tests
│   │   ├── forms.test.js             # Form element search tests
│   │   ├── iframes.test.js           # Cross-frame search tests
│   │   ├── radio-iframe-table.test.js # Radio + iframe + table tests
│   │   ├── shadow-dom.test.js        # Shadow DOM traversal tests
│   │   ├── switches.test.js          # Switch element tests
│   │   ├── tables.test.js            # Table element tests
│   │   ├── fixtures/                 # HTML test pages
│   │   │   ├── demo-page.html
│   │   │   ├── element-types.html
│   │   │   ├── dropdowns.html
│   │   │   ├── forms.html
│   │   │   ├── iframes.html
│   │   │   ├── inventory.html
│   │   │   ├── shadow-dom.html
│   │   │   ├── tables.html
│   │   │   └── ...
│   │   └── helpers/
│   │       └── driver-helper.js  # Shared Selenium driver setup/cleanup
│   └── fixtures/                  # Shared HTML test pages
│
└── coverage/                     # Test coverage reports (v8 provider)
```

## Core Concepts

### Four Search Functions

The library exposes four primary search strategies:

```javascript
// 1. Type-only: Find all elements of a semantic type
ElementFinder.findElementsByType({ type: 'button' })

// 2. Attribute-only: Find any element matching text in searchable attributes
ElementFinder.findElementsByAttribute({ value: 'Submit' })

// 3. Combined strict: Find elements matching BOTH type AND attribute
ElementFinder.findElements({ type: 'button', text: 'Submit' })

// 4. Probabilistic fallback: Find by type+attribute, but accept nearby matches
ElementFinder.findProbableElements({ type: 'button', text: 'Click Me' })
```

### Element Type System

Types are defined as XPath-like expressions in `src/element-definitions.json`:

```json
{
  "button": "self::button or @role='button' or @type='button' or @type='submit'",
  "checkbox": "(self::input and @type='checkbox') or @role='checkbox'",
  "textbox": "self::textarea or (self::input and (@type='text' or @type='password' ...))",
  "dropdown": "(self::select[descendant::option] or @role='combobox' ...)",
  "element": "true()"
}
```

**Supported types**: `link`, `navigation`, `heading`, `button`, `checkbox`, `switch`, `slider`, `datepicker`, `colorpicker`, `radio`, `dropdown`, `textbox`, `file`, `list`, `listitem`, `menu`, `menuitem`, `toolbar`, `dialog`, `table`, `row`, `column`, `cell`, `image`, `element`

### Attribute Matching Strategy

Searchable attributes are checked in priority order (from `src/searchable-attributes.json`):

```json
[
  "placeholder",
  "value",
  "data-value",
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
]
```

If no attribute matches, falls back to direct text nodes, then full `textContent`. Text matching is **case-sensitive** by default. Elements inside `<style>` or `<script>` tags are always skipped.

### Shadow DOM & Iframe Support

- **Shadow DOM**: `getAllElements()` uses iterative stack-based traversal with shadow root penetration
- **Iframes**: `getAllFrames()` collects all same-origin iframes. Search results (`findElements`, `findElementsByType`, `findElementsByAttribute`, `findProbableElements`) traverse **all** same-origin frames. Elements inside iframes are returned with their `frameIndex` (`0, 1, …`) but without an `element` reference, because a DOM node cannot be serialized across the frame boundary. Main-frame elements have `frameIndex: -1` and include the `element` reference.
- **Cross-origin iframes**: Gracefully skipped with `SecurityError` handling
- **Searching iframe contents**: Switch into the iframe context, then run the finder inside that frame to get interactable `element` references.

### Return Format

All search functions return:

```javascript
{
  elements: [
    {
      element: Element | undefined, // undefined for iframe elements (cross-frame boundary)
      boundingBox: {
        x,
        y,
        width,
        height,
        top,
        bottom,
        left,
        right,
        midx,
        midy,
        tagName,
      },
      tagName: string,
      frameIndex: number, // -1 = main frame (only frame returned; iframe contents excluded)
    },
  ]
}
```

## Development Commands

```bash
npm install                 # Install dependencies
npm run build               # Build index.js and index.min.js via esbuild
npm test                    # Build + run all tests
npm run test:watch          # Watch mode (re-run on changes)
npm run test:coverage       # Run with v8 coverage report
npm run lint                # ESLint check
```

### Test Configuration

- **Vitest** with `maxWorkers: 4` to run integration tests in parallel
- All tests run in real Chrome via Selenium for proper layout and shadow DOM support
- Coverage excludes `index.js` (browser-injected code) but covers `src/element-finder.js`

### Adding Dependencies

Check existing dependencies in `package.json` before adding new ones. Key dependencies:

- `selenium-webdriver` — Browser automation for integration tests
- `esbuild` — Bundling ESM → IIFE for browser injection
- `vitest` + `@vitest/coverage-v8` — Testing and coverage

## Code Conventions

### Module System

**ESM-only.** Source files use `import`/`export`. The build step (`build.js`) produces IIFE bundles for browser injection.

```javascript
// GOOD - source files
import elementDefinitionsData from './element-definitions.json' with { type: 'json' };
export function findElements(options = {}) { ... }

// BAD - never use require() in source
const data = require('./data.json')
```

### Functions Over Classes

This library is **function-based**, not class-based. All exports are named functions or constants. No classes, no constructor injection.

```javascript
// GOOD - pure function with exported state management
let SEARCHABLE_ATTRIBUTES = defaultAttributes;
export function setSearchableAttributes(attributes) { ... }
export function findElements(options = {}) { ... }

// BAD - don't introduce classes
class ElementFinder { constructor() { ... } }
```

### Performance-First Design

The library prioritizes runtime performance:

- **Pre-compiled type matchers**: `TYPE_MATCHERS` Map compiled at module load time
- **Stack-based DOM traversal**: Iterative (not recursive) to avoid stack overflow
- **Set-based innermost filtering**: O(n) instead of O(n²) for parent exclusion
- **Map-based column expansion**: O(1) lookups for table cell positions
- **Precompiled regex patterns**: `REGEX_PATTERNS` object avoids recompilation
- **Traditional for-loops**: With cached array lengths in hot paths

### One Export Per File (Source Modules)

Each source file exports a coherent set of related functions. The main module (`element-finder.js`) exports the complete API. Standalone modules export focused subsets.

### Error Handling

Use standard JavaScript errors with meaningful messages:

```javascript
// GOOD - typed errors with context
throw new TypeError(`type must be a string, got ${typeof type}`)
throw new Error('XPath expression exceeds maximum recursion depth')

// BAD - vague errors
throw new Error('fail')
```

### Prefer `undefined` over `null`

```javascript
// GOOD
if (parent === null || parent === undefined) {
  parent = document
}
return { found: false, count: 0 } // sentinel values for "not found"

// BAD
const result = null
```

### Early Returns and Reduced Nesting

```javascript
// GOOD
function matchesType(el, type) {
  if (el == null) return false
  const matcher = TYPE_MATCHERS.get(type)
  return matcher ? matcher(el) : false
}

// BAD
function matchesType(el, type) {
  if (el != null) {
    const matcher = TYPE_MATCHERS.get(type)
    if (matcher) {
      return matcher(el)
    } else {
      return false
    }
  }
  return false
}
```

### JSDoc Documentation

All public functions should have JSDoc annotations:

```javascript
/**
 * Finds elements matching the specified type and/or attribute value.
 * Searches all frames (main document + iframes) by default.
 * @param {Object} [options] - Options object
 * @param {string|null} [options.type="element"] - Element type or null for any type
 * @param {string} [options.text=''] - Attribute/text value to search for
 * @param {boolean} [options.exact=false] - Exact match vs substring
 * @param {Element|null} [options.parent=null] - Parent element to search within
 * @returns {{elements: Array<{element, boundingBox, tagName, frameIndex}>}} Found elements with metadata
 */
export function findElements(options = {}) { ... }
```

### Testing

- **Integration tests** (`tests/integration/`): Real Chrome browser via Selenium
- Tests should verify observable outcomes (element counts, properties), not internal structure
- Use `describe`/`it` blocks with meaningful names
- Integration tests inject the built `index.js` bundle into the browser

```javascript
// GOOD - behavior-focused integration test
it('should find all buttons when type is "button"', async () => {
  const result = await driver.executeScript(`
    return ElementFinder.findElements({ type: 'button' });
  `)
  expect(result.elements.length).toBe(7)
})

// GOOD - testing type matching in real browser
it('should match checkbox by type', async () => {
  const result = await driver.executeScript(`
    const input = document.createElement('input')
    input.type = 'checkbox'
    return ElementFinder.matchesType(input, 'checkbox')
  `)
  expect(result).toBe(true)
})
```

## Design Patterns

### 1. Pre-compiled Matchers

Type definitions are compiled into cached matcher functions at module load:

```javascript
const TYPE_MATCHERS = new Map()
for (const [type, expr] of Object.entries(elementDefinitionsData)) {
  TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el))
}
```

### 2. Iterative Stack Traversal

DOM traversal uses an explicit stack instead of recursion:

```javascript
const stack = [rootNode]
while (stack.length > 0) {
  const node = stack.pop()
  // process node, push children
}
```

### 3. Priority-Based Attribute Search

Attributes are checked in a defined priority order, falling back to text content:

```javascript
// Check prioritized attributes first
for (const attr of SEARCHABLE_ATTRIBUTES) { ... }
// Then direct text nodes
// Then full textContent
```

### 4. Innermost Element Filtering

Parent elements are excluded if they only match because a descendant matches:

```javascript
const matchedElements = new Set(matches.map((m) => m.element))
// Exclude parents that contain matching children
```

## Build System

The `build.js` script uses **esbuild** to produce browser-compatible IIFE bundles:

```javascript
await build({
  entryPoints: ['src/element-finder.js'],
  bundle: true,
  format: 'iife',
  globalName: 'ElementFinder',
  platform: 'browser',
  target: 'es2015',
})
```

- `index.js` — Unminified IIFE (for debugging)
- `index.min.js` — Minified IIFE (for production injection)
- Both are bundled from `src/element-finder.js` with JSON imports inlined

## Configuration Files

| File               | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `vitest.config.js` | Test timeout 30s, maxWorkers 2, v8 coverage              |
| `eslint.config.js` | @eslint/js recommended + prettier + browser/node globals |
| `build.js`         | esbuild IIFE bundler for browser injection               |

## Feature Roadmap

See `TODO.md` for the feature roadmap:

### Completed Optimizations

- [x] O(n) innermost element filtering with Set-based lookups
- [x] O(n) column expansion with Map-based position lookups
- [x] Code deduplication for highlight/unhighlight
- [x] Null input handling, shadow DOM safety, animation control

### Planned Features

- `waitForElement()` — Poll until found or timeout
- `getElementState()` — Get visibility/enabled/selected state
- `generateSelector()` — Generate unique CSS selector
- `findElements(options)` — Find elements by type and/or text

## Key Files for AI Agents

| File                             | Purpose                    | When to Reference                        |
| -------------------------------- | -------------------------- | ---------------------------------------- |
| `src/element-finder.js`          | Main canonical finder impl | Modifying search logic, adding features  |
| `src/element-inventory.js`       | DOM inventory generator    | Modifying inventory logic, adding fields |
| `src/element-definitions.json`   | Type → XPath mapping       | Adding new element types                 |
| `src/searchable-attributes.json` | Attribute priority list    | Changing attribute search order          |
| `scripts/build.js`               | esbuild configuration      | Changing build output format             |
| `tests/integration/*.test.js`    | Integration test suite     | Adding tests for finder or inventory     |
| `tests/fixtures/`                | HTML test pages            | Creating test scenarios                  |
| `ENGINEERING.md`                 | Technical reference        | Understanding architecture               |
| `TODO.md`                        | Feature roadmap            | Planning new features                    |

## Rules for AI Agents

1. **Function-based design** — this is a function library, not a class-based framework
2. **Performance matters** — use pre-compiled matchers, stack traversal, Set/Map lookups
3. **ESM source, IIFE build** — source uses `import`/`export`, build produces browser globals
4. **Test in real browser** — all tests run via Selenium in Chrome for proper layout & shadow DOM support
5. **Add JSDoc to new public APIs** — document parameters, return types, and thrown errors
6. **Follow existing naming conventions** — camelCase for functions/variables, kebab-case for files
7. **Check TODO.md** before implementing features that may already be planned
8. **Read ENGINEERING.md** for deep architectural understanding before making changes
9. **Build before testing** — `npm test` runs `npm run build` first, but always ensure `index.js` is up to date
10. **Shadow DOM safety** — always wrap `shadowRoot` access in try-catch for restricted elements
