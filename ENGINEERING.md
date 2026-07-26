# Engineering Documentation: Browser Element Finder

**Version**: 1.3.5  
**Last Updated**: June 2026  
**Purpose**: Complete technical reference for developing, maintaining, and extending the browser-element-finder library.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Patterns](#2-architecture--design-patterns)
3. [Element Type System](#3-element-type-system)
4. [Attribute Matching Strategy](#4-attribute-matching-strategy)
5. [The Five Search Functions](#5-the-five-search-functions)
6. [Element Counting Functions](#6-element-counting-functions)
7. [Return Format & Metadata](#7-return-format--metadata)
8. [Error Handling & Validation](#8-error-handling--validation)
9. [Testing Strategy](#9-testing-strategy)
10. [Performance Considerations](#10-performance-considerations)
11. [Build & Distribution](#11-build--distribution)
12. [Configuration Files](#12-configuration-files)
13. [Known Limitations & Edge Cases](#13-known-limitations--edge-cases)
14. [Common Usage Patterns](#14-common-usage-patterns)
15. [Development Workflow](#15-development-workflow)
16. [Troubleshooting Guide](#16-troubleshooting-guide)

---

## 1. Project Overview

### 1.1 Purpose & Mission

**Primary Goal**: Provide a robust, agent-friendly JavaScript library for identifying DOM elements by semantic type and/or text content in browser automation contexts (Selenium, Playwright, Puppeteer).

**Key Design Philosophy**:

- **Agent-First**: Built for automation tools and LLM agents that need reliable element identification
- **Performance-Optimized**: Pre-compiled matchers, stack-based traversal, O(n) algorithms
- **Type-Safe**: Strong validation with meaningful error messages, not silent failures
- **Flexible**: Multiple search strategies (type-only, attribute-only, combined strict, combined with fallback)
- **Isolation-Aware**: Respects iframe boundaries and shadow DOM isolation
- **Fallback Intelligence**: Gracefully handles partial matches by finding "probable" nearby elements

### 1.2 Use Cases

```javascript
// Case 1: Type-only search (find all buttons)
ElementFinder.findElementsByType({ type: 'button' })

// Case 2: Attribute-only search (find anything with text "Submit")
ElementFinder.findElementsByAttribute({ value: 'Submit' })

// Case 3: Strict combined search (find a button WITH text "Submit")
ElementFinder.findElements({ type: 'button', text: 'Submit' })

// Case 4: Probabilistic search (find a button, but nearby text "Submit" is OK)
ElementFinder.findProbableElements({ type: 'button', text: 'Submit' })

// Case 5: Find overlay/modal/dialog/banner elements
ElementFinder.findOverlayElements()

// Case 6: Find overlays at a specific point (e.g., where a click was intercepted)
ElementFinder.findOverlayElements(100, 200)
```

### 1.3 Project Structure

```
browser-element-finder/
├── src/
│   ├── element-finder.js              # Main canonical implementation
│   ├── element-definitions.json       # Type → XPath mapping
│   └── searchable-attributes.json     # Attribute search priority
├── tests/
│   ├── integration/                   # Real browser Selenium tests
│   │   ├── animations.test.js
│   │   ├── attributes.test.js
│   │   ├── edge-cases.test.js
│   │   ├── element-inventory.test.js
│   │   ├── find-elements.test.js
│   │   ├── form-state.test.js
│   │   ├── overlay-elements.test.js
│   │   ├── types.test.js
│   │   ├── viewport.test.js
│   │   ├── element-types.test.js
│   │   ├── dropdowns.test.js
│   │   ├── forms.test.js
│   │   ├── iframes.test.js
│   │   ├── overlays.test.js
│   │   ├── radio-iframe-table.test.js
│   │   ├── shadow-dom.test.js
│   │   ├── switches.test.js
│   │   ├── tables.test.js
│   │   ├── helpers/
│   │   └── fixtures/
│   └── fixtures/                      # Shared HTML test pages
├── scripts/
│   └── build.js                       # esbuild IIFE bundler
├── package.json
├── vitest.config.js
├── eslint.config.js
├── index.js                           # Built entry point
├── index.min.js                       # Minified version
└── ENGINEERING.md                     # This document
```

---

## 2. Architecture & Design Patterns

### 2.1 Module Organization Philosophy

**Why a Single Module?**

1. **element-finder.js** - Combined canonical module incorporating all search logic

**Rationale**:

- Simpler API surface with no redundant standalone modules
- All search strategies (type, attribute, combined, probable) share the same codebase
- Easier to maintain and test with a single source of truth

### 2.2 Pre-compiled Type Matchers

```javascript
// At module load time, compile all type definitions
const TYPE_MATCHERS = new Map()
for (const [type, expr] of Object.entries(elementDefinitionsData)) {
  if (expr === 'true()') {
    TYPE_MATCHERS.set(type, () => true)
  } else {
    TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el))
  }
}
```

**Design Rationale**:

- **Compile once**: XPath parsing happens once per type at module load
- **Cache result**: Each type's matcher function is cached for reuse
- **Performance**: ~10-100x faster than parsing expressions on every search
- **Memory efficient**: Only stores type definitions that are actually used

**Trade-off**: Slightly slower module load, but massive improvement for searches with repeated types.

### 2.3 Stack-Based DOM Traversal

```javascript
// Use iterative stack instead of recursion
const stack = [rootNode]
const matches = []

while (stack.length > 0) {
  const node = stack.pop()

  // Process current node
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (matchesType(node, type)) {
      matches.push(node)
    }
  }

  // Add children to stack for processing
  for (let i = node.children.length - 1; i >= 0; i--) {
    stack.push(node.children[i])
  }

  // Handle shadow DOM
  if (node.shadowRoot) {
    for (let i = node.shadowRoot.children.length - 1; i >= 0; i--) {
      stack.push(node.shadowRoot.children[i])
    }
  }
}
```

**Design Rationale**:

- **No recursion limit**: Avoids stack overflow on deeply nested DOMs
- **Efficient**: O(n) traversal, each node visited once
- **Shadow DOM support**: Treats shadow roots like normal children
- **LIFO ordering**: Processes nodes in depth-first order (most intuitive)

### 2.4 Innermost Match Filtering

After collecting all matches, filter out parent elements that contain child matches:

```javascript
// Example: DOM has both a button and its parent div that both match.
// We want just the button (innermost), not the container.

const innermostMatches = []
const matchedElements = new Set(matches.map((m) => m.element))
const excludedElements = new Set()

for (let i = matches.length - 1; i >= 0; i--) {
  const match = matches[i]
  if (!excludedElements.has(match.element)) {
    innermostMatches.unshift(match)

    // Mark all parents of this match for exclusion
    let parent = match.element.parentElement
    while (parent) {
      if (matchedElements.has(parent)) {
        excludedElements.add(parent)
      }
      parent = parent.parentElement
    }
  }
}
```

**Design Rationale**:

- **Users want leaves, not containers**: Most automation scenarios need the actual clickable element, not its wrapper
- **O(n²) → O(n) optimization**: Using Set for O(1) lookups instead of array searching
- **Semantic correctness**: A button inside a container should return the button, not the container

### 2.5 Multi-Frame Support

```javascript
export function getAllFrames(root = window) {
  const frames = []
  try {
    frames.push({
      window: root,
      document: root.document,
      isMainFrame: true,
      frameIndex: -1,
    })

    const iframes = root.document.querySelectorAll('iframe')
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i]
      try {
        if (iframe.contentWindow && iframe.contentDocument) {
          frames.push({
            window: iframe.contentWindow,
            document: iframe.contentDocument,
            isMainFrame: false,
            frameElement: iframe,
            frameIndex: i,
          })
        }
      } catch (e) {
        if (e.name === 'SecurityError') {
          console.warn('Skipping cross-origin iframe:', e.message)
        } else {
          console.warn('Error accessing iframe:', e.message)
        }
      }
    }
  } catch (e) {
    console.warn('Error getting frames:', e.message)
  }
  return frames
}
```

**Design Rationale**:

- **Same-origin only**: Cross-origin iframes throw SecurityError, caught and skipped
- **Flat structure**: Collects only the direct child iframes of the current window (no recursion into nested frames)
- **Metadata tracking**: Each frame includes its index for debugging and context switching
- **Graceful degradation**: Partial results from accessible frames if some are cross-origin
- **All same-origin frames for results**: Search results (`findElements`, `findElementsByType`, `findElementsByAttribute`, `findProbableElements`, `findOverlayElements` full scan) and `getElementCounts`/`getViewportElementCounts` traverse all same-origin frames. Elements inside iframes are returned with their `frameIndex` (`0, 1, …`) but without an `element` reference, because a DOM node cannot be serialized across the frame boundary. Main-frame elements have `frameIndex: -1` and include the `element` reference. To get interactable `element` references for iframe contents, switch into the iframe context and run the finder there. `getElementInventory()` also traverses all same-origin frames and returns a separate `{ frame, elements, overlay }` group per frame (main frame `frame: -1`, iframes `0, 1, …`), where each element is an object `{ type, description, inViewport, isHidden, formState, index }` and each group also carries an `overlay` field (`{ type, description, inViewport, isHidden, formState, index }` of the visible overlay containing the most inventory descendants, or `null`).

### 2.6 Shadow DOM Traversal

```javascript
// Stack-based traversal automatically handles shadow roots:
if (node.shadowRoot) {
  try {
    for (let i = node.shadowRoot.children.length - 1; i >= 0; i--) {
      stack.push(node.shadowRoot.children[i])
    }
  } catch (err) {
    // Some shadow roots are restricted (video, input, etc.)
    // Silently skip them
  }
}
```

**Design Rationale**:

- **Encapsulation respected**: Shadow DOM content is isolated from parent searches
- **Try-catch safety**: Some shadow roots are restricted and throw errors
- **Consistent traversal**: Shadow DOM treated same as regular DOM for consistency

---

## 3. Element Type System

### 3.1 XPath-Like Expression Language

Element types use a custom XPath-like syntax designed for browser environments:

```
EXPRESSION := TERM | TERM 'or' EXPRESSION | TERM 'and' EXPRESSION
TERM := 'self::' TAG | '@' ATTR | '@' ATTR '=' VALUE | CONDITION
CONDITION := 'contains' '(' '@' ATTR ',' VALUE ')' | 'ancestor::*[...]' | 'descendant::' TAG
```

**Examples**:

```
self::button                    → <button> tags only
@role='button'                  → Elements with role="button"
@type='submit'                  → Elements with type="submit"
self::button or @role='button'  → Either buttons or ARIA buttons
self::input and @type='email'   → Input with type=email (both conditions)
contains(@aria-label, 'click')  → Elements containing "click" in aria-label
```

### 3.2 Parser Implementation

The `parseXPath(expr, el, depth)` function:

```javascript
export function parseXPath(expr, el, depth = 0) {
  if (expr == null || el == null) return false
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error('XPath expression exceeds maximum recursion depth')
  }

  expr = expr.trim()
  if (expr === 'true()') return true

  // Step 1: Handle outermost parentheses
  if (expr[0] === '(' && expr[expr.length - 1] === ')') {
    // Check if they're matching (not splitting an 'or')
    // If so, strip and recurse
  }

  // Step 2: Try OR conditions (lower precedence)
  const orParts = splitByOperator(expr, 'or')
  if (orParts.length > 1) {
    for (const part of orParts) {
      if (parseXPath(part, el, depth + 1)) return true
    }
    return false
  }

  // Step 3: Try AND conditions (higher precedence)
  const andParts = splitByOperator(expr, 'and')
  if (andParts.length > 1) {
    for (const part of andParts) {
      if (!parseXPath(part, el, depth + 1)) return false
    }
    return true
  }

  // Step 4: Parse individual conditions
  return parseCondition(expr, el)
}
```

**Parsing Strategy**:

1. **Parentheses stripping**: Remove outermost matching parens
2. **Operator precedence**: `or` is lower precedence than `and` (check `or` first)
3. **Short-circuit evaluation**: Stop early for `or` true, `and` false
4. **Depth tracking**: Prevents stack overflow from malformed expressions

### 3.3 Condition Parser

```javascript
function parseCondition(cond, el) {
  // self::tagname
  if (cond.startsWith('self::')) {
    const tag = cond.slice(6).toLowerCase()
    return el.tagName.toLowerCase() === tag
  }

  // @attribute (existence check)
  if (cond.startsWith('@')) {
    const match = cond.match(/^@([a-z0-9-]+)$/i)
    if (match) return el.hasAttribute(match[1])
  }

  // @attribute='value'
  if (cond.includes('@') && cond.includes('=')) {
    const match = cond.match(/@([a-z0-9-]+)\s*=\s*['"]([^'"]*)['"]/i)
    if (match) {
      const [, attr, value] = match
      return el.getAttribute(attr) === value
    }
  }

  // contains(@attribute, 'value')
  if (cond.startsWith('contains(')) {
    const match = cond.match(/contains\(@([a-z0-9-]+),\s*['"]([^'"]+)['"]\)/i)
    if (match) {
      const [, attr, value] = match
      const attrValue = el.getAttribute(attr) || ''
      return attrValue.includes(value)
    }
  }

  // descendant::tagname
  if (cond.includes('descendant::')) {
    const match = cond.match(/descendant::([a-z0-9-]+)/i)
    if (match) {
      const tag = match[1].toLowerCase()
      return el.querySelector(tag) !== null
    }
  }

  return false
}
```

**Key Features**:

- **Type-safe**: Returns boolean for all cases
- **Regex-based**: Precompiled patterns in REGEX_PATTERNS object
- **Error resilient**: Invalid conditions return false, not error

### 3.4 Supported Element Types

```json
{
  "link": "self::a or @role='link' or @href",
  "navigation": "@role='navigation' or self::nav",
  "heading": "@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
  "button": "self::button or @role='button' or @type='button' or @type='submit'",
  "checkbox": "(self::input and @type='checkbox') or @role='checkbox'",
  "switch": "(self::input and @type='checkbox') or @role='switch' or (self::button and (contains(@class, 'switch') or @data-state))",
  "slider": "self::input[@type='range'] or @role='slider'",
  "datepicker": "self::input[@type='date'] or @role='date'",
  "colorpicker": "self::input[@type='color'] or @role='color'",
  "radio": "(self::input and @type='radio') or @role='radio'",
  "dropdown": "(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])",
  "textbox": "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email' or @type='number' or @type='tel' or @type='url')) or @role='textbox'",
  "file": "self::input and @type='file'",
  "list": "self::ul or self::ol or @role='list'",
  "listitem": "self::li or @role='listitem'",
  "menu": "self::menu or @role='menu'",
  "menuitem": "@role='menuitem'",
  "toolbar": "@role='toolbar'",
  "dialog": "@role='dialog' or @role='alertdialog'",
  "table": "self::table or @role='table'",
  "row": "self::tr or @role='row'",
  "column": "self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'",
  "cell": "self::td or @role='cell' or @role='gridcell'",
  "image": "self::img or @role='img' or @alt",
  "iframe": "self::iframe",
  "element": "true()"
}
```

**Design Philosophy**:

- **Semantic first**: Definitions follow HTML5 and ARIA specifications
- **Practical fallbacks**: Include common patterns (class-based components)
- **Scope expansion**: Each type is inclusive (button matches all button-like elements)
- **Future-proof**: Easy to extend with new types

### 3.5 Adding New Element Types

**Process**:

1. **Understand the element semantics**:

   ```javascript
   // Example: "slider" element type
   // Must match:
   // - Native <input type="range">
   // - ARIA role="slider"
   // - Custom components with slider pattern
   ```

2. **Add to element-definitions.json**:

   ```json
   {
     "slider": "self::input[@type='range'] or @role='slider' or (self::div and @data-slider and @tabindex)"
   }
   ```

3. **Add integration test** in `tests/integration/types.test.js`:

   ```javascript
   it('should match native range inputs as slider', async () => {
     const result = await fixture.driver.executeScript(`
       const input = document.createElement('input');
       input.type = 'range';
       input.min = '0';
       input.max = '100';
       document.body.appendChild(input);
       return ElementFinder.findElementsByType({ type: 'slider' });
     `)
     expect(result.elements.length).toBe(1)
   })
   ```

   ```javascript
   it('should find slider in complex form', async () => {
     const result = await driver.executeScript(`
       return ElementFinder.findElementsByType({ type: 'slider' });
     `)
     expect(result.elements.length).toBeGreaterThan(0)
   })
   ```

4. **Rebuild and test**:
   ```bash
   npm run build && npm test
   ```

---

## 4. Attribute Matching Strategy

### 4.1 Search Priority

Attributes are searched in this order (from `searchable-attributes.json`):

```json
[
  "name", // HTML name attribute
  "aria-label", // Accessibility labels
  "aria-labelledby", // References to label elements
  "aria-placeholder", // ARIA placeholder text
  "aria-valuetext", // ARIA value text
  "aria-description", // ARIA description
  "placeholder", // Form hints
  "hint", // Framework hints
  "title", // Tooltip titles
  "tooltip", // Explicit tooltips
  "alt", // Image alt text
  "data-value", // Framework value
  "data-test-id", // Test framework IDs
  "data-testid", // Popular test library ID
  "id", // Element ID
  "resource-id", // Mobile/framework specific
  "src", // Source attributes
  "value" // Current form values
]
```

**Design Rationale**:

- **Test IDs first**: Most reliable for automation
- **HTML semantics second**: Standard attributes
- **ARIA third**: Accessibility-based identification
- **Fallback last**: Generic attributes

### 4.2 Text Extraction Hierarchy

```javascript
export function matchesAttribute(el, value, exact = false) {
  // Step 1: Check searchable attributes in priority order
  for (const attr of SEARCHABLE_ATTRIBUTES) {
    const attrValue = el.getAttribute(attr)
    if (attrValue) {
      const matches = exact ? attrValue === value : attrValue.includes(value)
      if (matches) return true
    }
  }

  // Step 2: Check direct text nodes (immediate children only)
  // This matches text directly in the element, not in nested elements
  const directText = getDirectText(el)
  if (directText) {
    const matches = exact ? directText === value : directText.includes(value)
    if (matches) return true
  }

  // Step 3: Check full text content (includes all nested text)
  // This is a fallback for text deep in the element tree
  const fullText = el.textContent
  if (fullText) {
    const matches = exact ? fullText === value : fullText.includes(value)
    if (matches) return true
  }

  return false
}
```

**Matching Precedence**:

1. **Attributes** (most specific)

   ```html
   <button id="submit">Click</button>
   <!-- Matches via ID attribute when searching for 'submit' -->
   ```

2. **Direct text** (immediate content)

   ```html
   <button>Submit</button>
   <!-- Matches direct text when searching for 'Submit' -->
   ```

3. **Nested text** (fallback)
   ```html
   <button><span>Submit</span></button>
   <!-- Matches nested text when searching for 'Submit' -->
   ```

### 4.3 Exact vs. Substring Matching

```javascript
// Substring matching (default)
findElements({ text: 'Submit' })
// Matches:
// - "Submit Button"
// - "Click to Submit"
// - "Submit Now"

// Exact matching
findElements({ text: 'Submit', exact: true })
// Matches ONLY:
// - "Submit" (exact text)
// - id="Submit"
// - aria-label="Submit"
```

**When to use each**:

- **Substring** (default): Flexible for real-world DOMs with extra text
- **Exact**: Strict requirement, test IDs, or unique identifiers

### 4.4 Excluded Content

Elements inside `<style>` or `<script>` tags are automatically excluded:

```javascript
function isInsideStyleOrScript(el) {
  if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return true

  let parent = el.parentElement
  while (parent) {
    if (parent.tagName === 'STYLE' || parent.tagName === 'SCRIPT') {
      return true
    }
    parent = parent.parentElement
  }

  return false
}
```

**Design Rationale**:

- **CSS and JS aren't content**: Minified JS or CSS text shouldn't match actual elements
- **Prevent false matches**: "loading" in script code ≠ actual loading indicator
- **Performance**: Small optimization skipping entire branches

### 4.5 Customizing Search Attributes

```javascript
// Set custom search priority for your project
ElementFinder.setSearchableAttributes([
  'data-qa', // Project-specific ID
  'data-test-id',
  'id',
  'aria-label',
  'placeholder',
  'value',
])

// Verify what's being used
console.log(ElementFinder.getSearchableAttributes())
// ['data-qa', 'data-test-id', 'id', 'aria-label', 'placeholder', 'value']
```

### 4.6 Inspecting Attribute Values

Use `getSearchableAttributeValues(el)` to inspect the current non-empty searchable attribute values on a specific element.

```javascript
const input = document.querySelector('input')
const values = ElementFinder.getSearchableAttributeValues(input)

console.log(values)
// { placeholder: 'Email Address', 'data-testid': 'email-input', id: 'email' }
```

Behavior:

1. Returns `{}` for `null`, `undefined`, or non-element nodes.
2. Only includes attributes currently configured in `SEARCHABLE_ATTRIBUTES`.
3. Omits missing attributes and attributes whose value is `''`.
4. Preserves the current searchable-attribute order in the returned object keys.

**Use Cases**:

- Your project uses `data-qa` instead of `data-testid`
- Different priority order for your app structure
- Add project-specific attributes to search
- Inspect an element before debugging why a text search did or did not match

---

## 5. The Five Search Functions

### 5.1 `findElementsByType(options)`

**Purpose**: Find all elements matching a semantic type definition.

**Signature**:

```javascript
export function findElementsByType(options = {})
  → { elements: [...] }
```

**Parameters**:

| Parameter        | Type            | Default     | Description                            |
| ---------------- | --------------- | ----------- | -------------------------------------- |
| `options.type`   | `string`        | `"element"` | Element type (see ELEMENT_DEFINITIONS) |
| `options.parent` | `Element\|null` | `null`      | Parent element to search within        |

**Example Usage**:

```javascript
// Find all buttons on the page
const result = ElementFinder.findElementsByType({ type: 'button' })
// { elements: [{ element: <button>, ... }, ...] }

// Find all textboxes in a form
const form = document.getElementById('login-form')
const result = ElementFinder.findElementsByType({
  type: 'textbox',
  parent: form,
})
// Returns only textboxes within the form
```

### 5.2 `findElementsByAttribute(options)`

**Purpose**: Find all elements matching searchable attributes or text content.

**Signature**:

```javascript
export function findElementsByAttribute(options = {})
  → { elements: [...] }
```

**Parameters**:

| Parameter        | Type            | Default | Description                       |
| ---------------- | --------------- | ------- | --------------------------------- |
| `options.value`  | `string`        | `''`    | The attribute value to search for |
| `options.exact`  | `boolean`       | `false` | Exact match vs substring          |
| `options.parent` | `Element\|null` | `null`  | Parent element to search within   |

**Example Usage**:

```javascript
// Find elements with text containing "Submit"
const result = ElementFinder.findElementsByAttribute({ value: 'Submit' })
// Returns all elements (any type) containing "Submit"
// Matches: <button>Submit</button>, id="submit", placeholder="submit", etc.

// Exact match only
const result = ElementFinder.findElementsByAttribute({
  value: 'Submit',
  exact: true,
})
// Returns only elements with exactly "Submit" (not "Submit Button")

// Search within a specific container
const dialog = document.querySelector('[role="dialog"]')
const result = ElementFinder.findElementsByAttribute({
  value: 'Close',
  parent: dialog,
})
```

### 5.3 `findElements(options)` - Strict Combined

**Purpose**: Find elements matching BOTH a type AND attribute/text (no fallback).

**Signature**:

```javascript
export function findElements(options = {})
  → { elements: [...] }
```

**Parameters**:

| Parameter        | Type            | Default | Description                                                  |
| ---------------- | --------------- | ------- | ------------------------------------------------------------ |
| `options.type`   | `string\|null`  | `null`  | Element type (see ELEMENT_DEFINITIONS), or null for any type |
| `options.text`   | `string`        | `''`    | Text/attribute value to search for, or `''` for any text     |
| `options.exact`  | `boolean`       | `false` | Exact match vs substring                                     |
| `options.parent` | `Element\|null` | `null`  | Parent element to search within                              |

**Validation**:

- Throws `TypeError` if `options` is not an object (including null, arrays, primitives)
- Throws `TypeError` if `type` is provided but not a string
- Throws `TypeError` if `text` is provided (non-empty) but not a string
- Returns `{ elements: [] }` with a console warning for unknown element types

**Algorithm**:

```
1. Accept options object { type, text, exact, parent }
2. Validate inputs (type must be string if provided, text must be string if non-empty)
3. Traverse all same-origin frames with stack-based DOM traversal
4. For each element:
   - If type is specified: check matchesType(el, type)
   - If text is specified (non-empty): check matchesAttribute(el, text, exact)
   - Both must match (AND logic) when both are provided
5. Collect matching elements across all frames
6. When text is provided: filter to innermost matches using hasOwnMatch()
   - Keep elements with their own direct attribute/text match
   - Exclude parent elements that only match via a descendant's text
7. Return results with bounding box metadata (iframe elements have no element reference)
```

**Key Behavior**: Returns empty if no element matches BOTH conditions.

**Example Usage**:

```javascript
// Find a button with text "Submit" - strict match only
const result = ElementFinder.findElements({ type: 'button', text: 'Submit' })
// ONLY returns buttons that contain "Submit"
// Does NOT return labels with "Submit" even if nearby a button

// Find any type with text "Login"
const result = ElementFinder.findElements({ text: 'Login' })
// Returns any element containing "Login" (buttons, links, divs, etc.)

// Find all textboxes (strict type match)
const result = ElementFinder.findElements({ type: 'textbox' })
// Returns all textboxes (input[type=text], textarea, [role=textbox])
// Returns empty if no textboxes exist

// Exact match within a container
const dialog = document.querySelector('[role="dialog"]')
const result = ElementFinder.findElements({
  type: 'button',
  text: 'Close',
  exact: true,
  parent: dialog,
})
```

**Return Value**:

- Non-empty if direct match found
- Empty array if no element matches both conditions
- No fallback behavior

### 5.4 `findProbableElements(options)` - Combined with Fallback

**Purpose**: Find elements matching both type and text, with intelligent fallback to nearby elements.

**Signature**:

```javascript
export function findProbableElements(options = {})
  → { elements: [...] }
```

**Parameters**:

| Parameter        | Type            | Default | Description                                                  |
| ---------------- | --------------- | ------- | ------------------------------------------------------------ |
| `options.type`   | `string\|null`  | `null`  | Element type (see ELEMENT_DEFINITIONS), or null for any type |
| `options.text`   | `string`        | `''`    | Text/attribute value to search for, or `''` for any text     |
| `options.exact`  | `boolean`       | `false` | Exact match vs substring                                     |
| `options.parent` | `Element\|null` | `null`  | Parent element to search within                              |

**Validation**:

- Throws `TypeError` if `options` is not an object (including null, arrays, primitives)
- Throws `TypeError` if `type` is provided but not a string
- Throws `TypeError` if `text` is provided (non-empty) but not a string
- Returns `{ elements: [] }` with a console warning for unknown element types

**Delegation**: When only one criterion is provided, the function delegates to another search function so that result sets and counts stay consistent:

- **Type only** (`{ type: 'button' }`) → delegates to `findElements({ type, parent })`
- **Text only** (`{ text: 'Submit' }`) → delegates to `findElementsByAttribute({ value: text, exact, parent })`

**Algorithm**:

```
PHASE 0: Normalize & delegate
  - If only type is provided: delegate to findElements({ type, parent })
  - If only text is provided: delegate to findElementsByAttribute({ value: text, exact, parent })

PHASE 1: Direct Match (both type AND text provided)
  For each element in all same-origin frames:
    if matchesType(element, type) AND matchesAttribute(element, text):
      add to matches

PHASE 2: Fallback (only if Phase 1 finds nothing)
  For each element with its own direct attribute/text match:
    nearby = findNearbyElementType(element, type)
    if nearby element exists and not already found:
      add to matches

PHASE 3: Post-process
  When text is provided: filter to innermost matches using hasOwnMatch()
    - Keep elements with their own direct attribute/text match
    - Exclude parent elements that only match via a descendant's text
  Return with bounding boxes and metadata
```

**Example Usage**:

```javascript
// Best case: element and text in same element
const result = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Submit',
})
// Direct match: returns the button immediately

// Fallback case: text in parent or child
const result = ElementFinder.findProbableElements({
  type: 'textbox',
  text: 'Username',
})
// Direct match fails (span isn't textbox)
// Fallback: finds nearby input element

// Type-only search (delegates to findElements)
const result = ElementFinder.findProbableElements({ type: 'button' })
// Returns all buttons, same as findElements({ type: 'button' })

// Text-only search (delegates to findElementsByAttribute)
const result = ElementFinder.findProbableElements({ text: 'Submit' })
// Returns any element containing "Submit"
```

**Why This Matters**:

Real-world UI patterns often separate content from interactive elements:

```html
<!-- Pattern 1: Label separate from input -->
<label>Email Address</label>
<input type="email" />
<!-- Without fallback: can't find textbox by "Email Address" text
     With fallback: findProbableElements({ type: 'textbox', text: 'Email Address' }) → finds the input -->

<!-- Pattern 2: Button with icon, text in span -->
<button>
  <icon />
  <span>Save Changes</span>
</button>
<!-- Without fallback: might need exact element matching
     With fallback: findProbableElements({ type: 'button', text: 'Save Changes' }) → finds button -->

<!-- Pattern 3: Menu items with nested content -->
<button class="menu-item">
  <span class="label">Delete</span>
  <span class="hotkey">Ctrl+D</span>
</button>
<!-- Without fallback: multiple matches depending on nested content
     With fallback: findProbableElements({ type: 'button', text: 'Delete' }) → finds button -->
```

**Fallback Search Strategy** (`findNearbyElementType`):

```javascript
function findNearbyElementType(el, targetType) {
  // Step 1: Check parent chain (walk up)
  let current = el.parentElement
  while (current) {
    if (matchesType(current, targetType)) {
      return current // Found parent matching type
    }
    current = current.parentElement
  }

  // Step 2: Check siblings (same level)
  if (el.parentElement) {
    for (const sibling of el.parentElement.children) {
      if (sibling !== el && matchesType(sibling, targetType)) {
        return sibling // Found sibling matching type
      }
    }
  }

  // Step 3: Check children (walk down)
  const allElements = getAllElements(el)
  for (const child of allElements) {
    if (child !== el && matchesType(child, targetType)) {
      return child // Found child matching type
    }
  }

  return null // No nearby element found
}
```

**Priority Order**:

1. **Parent** - Most semantic (element is contained by target)
2. **Siblings** - Common pattern (elements at same level)
3. **Children** - Less common (content contained in element)

**Example Usage**:

```javascript
// Best case: element and text in same element
const button = document.createElement('button')
button.textContent = 'Submit'
const result = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Submit',
})
// Direct match: returns the button immediately

// Fallback case: text in parent or child
const container = document.createElement('div')
const label = document.createElement('span')
label.textContent = 'Username'
const input = document.createElement('input')
input.type = 'text'
container.appendChild(label)
container.appendChild(input)

const result = ElementFinder.findProbableElements({
  type: 'textbox',
  text: 'Username',
})
// Direct match fails (span isn't textbox)
// Fallback: finds nearby input element
// Returns: the input element with "Username" label nearby
```

**When to use which function**:

| Function                  | Use When                                                       |
| ------------------------- | -------------------------------------------------------------- |
| `findElementsByType`      | Just need a specific element type (any button)                 |
| `findElementsByAttribute` | Just need text/attribute matching (any element with "Submit")  |
| `findElements`            | Need STRICT matching (must be button WITH "Submit" text in it) |
| `findProbableElements`    | Need FLEXIBLE matching (button with text nearby is OK)         |
| `findOverlayElements`     | Need to find modals, dialogs, banners, popups, overlays        |

---

### 5.5 `findOverlayElements(x = null, y = null)`

**Purpose**: Find all overlay elements on the page (modals, dialogs, banners, popups, tooltips).
When coordinates are provided, uses `document.elementsFromPoint()` to find overlays at that specific point instead of scanning the entire DOM.

**Signature**:

```javascript
export function findOverlayElements(x = null, y = null)
  → { elements: [...] }
```

**Parameters**:

| Parameter | Type             | Default | Description                                                          |
| --------- | ---------------- | ------- | -------------------------------------------------------------------- |
| `x`       | `number \| null` | `null`  | X coordinate in viewport pixels. Must be provided together with `y`. |
| `y`       | `number \| null` | `null`  | Y coordinate in viewport pixels. Must be provided together with `x`. |

**Validation Rules**:

- If only one of `x` or `y` is provided, throws `TypeError: Both x and y coordinates must be provided together`
- If either `x` or `y` is not a finite number, throws `TypeError: x and y must be finite numbers`
- When both are `null` (default), performs a full DOM scan across all same-origin frames (iframe elements are returned with `frameIndex >= 0` and no `element` reference)

**Key Differences from Other Search Functions**:

- **Optional point-based search** — Accepts optional `x, y` coordinates for targeted overlay detection
- **Heuristic-based detection** — Uses priority-ordered heuristics to identify overlay elements
- **No innermost filtering** — Returns all matching overlays (not just leaf elements)
- **Main frame only for point search** — When coordinates are provided, only searches the main document via `elementsFromPoint()` (cross-frame point lookup is not supported)

**Detection Heuristics** (checked in priority order):

1. **ARIA roles** — `role="dialog"`, `role="alertdialog"`, `role="tooltip"`, `role="menu"`, `role="listbox"`
2. **aria-modal** — `aria-modal="true"`
3. **Native dialog** — Open `<dialog>` element (has `open` attribute)
4. **Popover API** — Elements with `[popover]` attribute
5. **High z-index + fixed/sticky** — `z-index > 999` with `position: fixed` or `position: sticky`
6. **Moderate z-index + absolute** — `z-index > 100` with `position: absolute` and non-zero rendered dimensions
7. **Class name patterns** — Classes matching `/[Cc]ookie|[Cc]onsent|[Bb]anner|[Oo]verlay|[Mm]odal|[Pp]opup|[Dd]ropdown|[Mm]enu-[A-z]|Flyout|[Ss]heet/`

**Algorithm**:

```
When x and y are provided (point-based search):
1. Validate both coordinates are finite numbers
2. Call document.elementsFromPoint(x, y) to get render stack at that point
3. Filter the stack by isOverlayElement() heuristic check
4. Deduplicate using a Set
5. Map to qualified result format with boundingBox, tagName, frameIndex=-1, isHidden, inViewport
6. Return results (main frame only)

When no coordinates are provided (full scan — default):
1. Iterate all same-origin frames (main document + iframes)
2. Get all elements via getAllElements()
3. Filter by isOverlayElement() heuristic check
4. Map to qualified result format with boundingBox, tagName, frameIndex, isHidden, inViewport
5. Return results (iframe elements have frameIndex >= 0 and no element reference)
```

**Return Format**:

Same as other search functions — array of elements with metadata:

```javascript
{
  elements: [
    {
      element: Element | undefined,
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
      isHidden: boolean,
      inViewport: boolean,
    },
  ]
}
```

**Example Usage**:

```javascript
// Find all overlay elements on the page (full DOM scan across all same-origin frames)
const overlays = ElementFinder.findOverlayElements()
// Returns modals, dialogs, banners, popups, tooltips from all same-origin frames (iframe elements have no element reference)

// Find overlays at a specific point (e.g., where a click was intercepted)
const overlaysAtPoint = ElementFinder.findOverlayElements(100, 200)
// Returns only overlays present in the render stack at (100, 200)
// Much faster for targeted detection after ElementClickInterceptedError

// Filter to only visible overlays
const visibleOverlays = overlays.elements.filter(
  (e) => !e.isHidden && e.inViewport,
)

// Check if any modal is blocking interaction
const hasModal = overlays.elements.some(
  (e) => e.element && e.element.getAttribute('aria-modal') === 'true',
)
```

**Why This Matters**:

In browser automation, overlay elements often block interaction with underlying page content. Identifying overlays helps agents:

- Detect when a modal is blocking the UI before attempting clicks
- Find cookie consent banners that need dismissal
- Identify toast notifications or popups that may interfere with element targeting
- Determine if a dialog needs to be closed before continuing automation

**Point-based search for click interception**:

When an `ElementClickInterceptedError` occurs, the point-based mode is ideal:

1. Get the target element's center coordinates from `getBoundingBox()`
2. Call `findOverlayElements(centerX, centerY)` to get overlays at that exact point
3. The returned elements are already sorted by render order (front-to-back)
4. Pick the first overlay to dismiss or handle

This is more accurate than a full DOM scan because it identifies the element that actually blocked the attempted click.

**Comparison with `findElementsByType({ type: 'dialog' })`**:

| Aspect           | `findElementsByType({ type: 'dialog' })` | `findOverlayElements()`            |
| ---------------- | ---------------------------------------- | ---------------------------------- |
| Detection method | ARIA `role="dialog"` only                | 6 heuristics (ARIA, z-index, etc.) |
| Parameters       | Takes options object                     | Optional x, y coordinates          |
| Coverage         | Only explicit ARIA dialogs               | Modals, banners, popups, tooltips  |
| Use case         | Accessibility auditing                   | Automation blocking detection      |

---

## 6. Element Counting Functions

### 6.1 `getElementCounts(options)`

**Purpose**: Count elements by semantic type and visibility across all same-origin frames (iframe elements are counted but have no `element` reference).

**Signature**:

```javascript
export function getElementCounts(options = {})
  → Object.<string, { visible: number, hidden: number, total: number }>
```

**Parameters**:

| Parameter        | Type            | Default | Description                                                              |
| ---------------- | --------------- | ------- | ------------------------------------------------------------------------ |
| `options.type`   | `string\|null`  | `null`  | Specific type to count. If `null`/`undefined`, counts all defined types. |
| `options.parent` | `Element\|null` | `null`  | Parent element to scope the count within.                                |

**Validation**:

- Throws `TypeError` if `type` is provided but not a string
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)

**Algorithm**:

```
1. Determine target types (single type or all defined types)
2. For each target type, call findElements({ type, parent }) as source of truth
3. Iterate returned elements, bucketing by isHidden flag
4. Return counts keyed by semantic type
```

**Return Format**:

```javascript
{
  button: { visible: 3, hidden: 0, total: 3 },
  textbox: { visible: 2, hidden: 1, total: 3 },
  link: { visible: 5, hidden: 0, total: 5 },
  // ... all other defined types
}
```

**Key Behaviors**:

- Uses `findElements()` internally as the source of truth — counts match its returned element set including innermost filtering
- Traverses all same-origin frames by default (iframe elements are counted but have no `element` reference)
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)
- Throws `TypeError` if `type` is provided but not a string
- The generic `element` type is included when counting all types

**Example Usage**:

```javascript
// Count all defined types
const counts = ElementFinder.getElementCounts()
// { button: { visible: 3, hidden: 0, total: 3 }, ... }

// Count a single type
const buttons = ElementFinder.getElementCounts({ type: 'button' })
// { button: { visible: 3, hidden: 0, total: 3 } }

// Count within a specific parent
const formButtons = ElementFinder.getElementCounts({
  type: 'button',
  parent: document.querySelector('form'),
})
```

### 6.2 `getViewportElementCounts(options)`

**Purpose**: Count elements by semantic type that are currently visible within the browser viewport. Unlike `getElementCounts`, this excludes elements outside the viewport entirely.

**Signature**:

```javascript
export function getViewportElementCounts(options = {})
  → Object.<string, { visible: number, hidden: number, total: number }>
```

**Parameters**:

| Parameter        | Type            | Default | Description                                                              |
| ---------------- | --------------- | ------- | ------------------------------------------------------------------------ |
| `options.type`   | `string\|null`  | `null`  | Specific type to count. If `null`/`undefined`, counts all defined types. |
| `options.parent` | `Element\|null` | `null`  | Parent element to scope the count within.                                |

**Validation**:

- Throws `TypeError` if `type` is provided but not a string
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)

**Algorithm**:

```
1. Determine target types (single type or all defined types)
2. For each target type, call findElements({ type, parent }) as source of truth
3. For each returned element, check inViewport() with threshold 60 — skip if outside viewport
4. Bucket viewport elements by isHidden flag
5. Return counts keyed by semantic type
```

**Return Format**:

```javascript
{
  button: { visible: 2, hidden: 0, total: 2 },
  textbox: { visible: 1, hidden: 0, total: 1 },
  // ... all other defined types (only viewport elements counted)
}
```

**Key Behaviors**:

- Uses `findElements()` internally as the source of truth for element discovery
- Filters by `inViewport()` with threshold 60 — only elements whose bounding box intersects the visual viewport are counted
- Elements outside the viewport are excluded entirely (not counted in any bucket)
- The `total` count represents all viewport elements (`visible + hidden`), not all page elements
- Traverses all same-origin frames by default (iframe elements are counted but have no `element` reference)
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)
- Throws `TypeError` if `type` is provided but not a string

**Example Usage**:

```javascript
// Count all defined types currently in viewport
const counts = ElementFinder.getViewportElementCounts()
// { button: { visible: 2, hidden: 0, total: 2 }, ... }

// Count one type in the viewport
const buttons = ElementFinder.getViewportElementCounts({ type: 'button' })
// { button: { visible: 2, hidden: 0, total: 2 } }

// Count within a parent element (viewport-scoped)
const inputs = ElementFinder.getViewportElementCounts({
  type: 'textbox',
  parent: document.querySelector('form'),
})
```

**Comparison with `getElementCounts`**:

| Aspect              | `getElementCounts`            | `getViewportElementCounts`          |
| ------------------- | ----------------------------- | ----------------------------------- |
| Scope               | Entire rendered page          | Current viewport only               |
| Off-screen elements | Included                      | Excluded                            |
| Uses `inViewport()` | No                            | Yes                                 |
| Performance         | Faster (no geometry checks)   | Slightly slower (rect calculations) |
| Use case            | Page inventory, accessibility | What the user can currently see     |

---

## 6.3 `getElementInventory()`

**Purpose**: Capture a compact, frame-grouped snapshot of identifiable elements for
state capture / guided interaction. Each element is an object with its semantic
`type`, an identifiable `description` (or a positional `#N` for text-less
elements), an `inViewport` flag, an `isHidden` flag, and its `formState` (or `null`). The complete page
is returned (no viewport filtering) — every element carries both `inViewport` and
`isHidden` booleans so callers can distinguish between "hidden" (`isHidden: true`)
and "visible but scrolled off-screen" (`isHidden: false`, `inViewport: false`).
Cross-origin iframes are silently skipped by `getAllFrames()`. Each
frame group also carries an `overlay` field: the visible overlay (an element that
passes `isOverlayElement` and is in the viewport) containing the most inventory
descendants, reported as `{ type, description, inViewport, isHidden, formState, index }` —
the same shape as a regular inventory entry — with `index` mirroring that element's
own entry index (occurrence within its `(type, text)` group), or `null` when no
visible overlay is present.

**Signature**:

```javascript
export function getElementInventory(parent = null)
  → Array<{
       frame: number,
       elements: Array<{
         type: string,
         description: string,
         inViewport: boolean,
         isHidden: boolean,
         formState: Object | null,
         index: number
       }>,
       overlay: { type: string, description: string | null, inViewport: boolean, isHidden: boolean, formState: Object | null, index: number } | null
     }>
```

**Parameters**:

- `parent` _(optional, `Element | null`, default `null`)_ — When omitted (or
  `null`), the function returns the full page across all same-origin frames;
  viewport membership is reported per element via `inViewport`. When a parent
  element is supplied, **only that parent's descendants** (its subtree,
  excluding the parent itself) are returned, grouped into a **single frame
  group** for the frame the parent lives in. The `#N` positional index is
  computed relative to that subtree (reset per call), matching `findElements()`
  ordering within the scope. This mirrors how `findElements(options)` treats
  `options.parent` as a search root.

**Nearby-label resolution** (always on): Many behavior-rich form
controls (checkbox, radio, select, text input) carry no own text. When the
element is a form type, a nearby `<label>` is used to override machine-generated
attributes (`value`/`id`/`resource-id`/`name`/`src`/`data-test-id`/`data-testid`/`data-value`),
while still yielding to explicit a11y/semantic text (`aria-label` /
`aria-labelledby`, `placeholder`, `data-*`). Two association patterns are supported:

1. **Wrapping label** — the control is a descendant of a `<label>`; the label's own
   direct text nodes are used (excluding any control descendant text).
2. **`for`-associated label** — a `<label for="id">` referencing the control's id.

**Text-less fallback**: Elements with no own text and no nearby label are included
with a positional `#N` identifier (N = 1-based position among same-type elements in
the frame, matching `findElements()` order). All real semantic types are eligible —
every type **except** `element` and `iframe` (see `TEXTLESS_TYPES`) — so generic
containers (`element`) and iframes are never promoted as inventory entries. This means text-less buttons,
links, images, and other controls are included, not just form controls. `#N` is
session-stable (capture → act in the same page state) but not durable across DOM
mutations; for durable references use `generateSelector()` (roadmap).

**Overlay detection for text-less containers**: Even though generic containers
(`element` type) and iframes are excluded from inventory entries, they are still
considered as overlay candidates. A `<div class="modal">` with no `id`, no
`aria-label`, and no own text will be detected as the dominant overlay if it
contains the most inventory descendants. The reported `overlay` object carries
`description: null` in this case, matching the shape of a text-less entry.

**Form-state field**: Mirrors `getFormState()` output, exposed as the `formState`
object on each element (or `null` when the element has no form state), making the
inventory actionable for replay:

| type                                     | `formState`                                 |
| ---------------------------------------- | ------------------------------------------- |
| `checkbox`                               | `{ checked: true }`                         |
| `radio`                                  | `{ set: false }`                            |
| `switch`                                 | `{ on: true }`                              |
| `textbox` / `colorpicker` / `datepicker` | `{ value: "abc" }`                          |
| `dropdown`                               | `{ selected: "A", options: ["A","B","C"] }` |
| `slider`                                 | `{ value: 42 }`                             |
| `file`                                   | `{ fileName: "x.png" }`                     |

**Example Usage**:

```javascript
// Full-page tree (default): each element is an object with inViewport + isHidden flags
ElementFinder.getElementInventory()
// [ { frame: -1, elements: [
//   { type: "button",  description: "Submit",  inViewport: true,  isHidden: false, formState: null },
//   { type: "checkbox", description: "CheckBox in iFrame", inViewport: false, isHidden: false, formState: { checked: false } },
//   { type: "radio",    description: "RadioButton 1", inViewport: false, isHidden: false, formState: { set: false } },
//   { type: "dropdown", description: "Select Dropdown", inViewport: false, isHidden: false,
//       formState: { selected: "Please choose...", options: ["Please choose...","Set to 25%"] } },
//   { type: "textbox",  description: null, index: 2, inViewport: false, isHidden: false, formState: { value: "" } }  // anonymous control, positional #N index
// ] } ]

// Scoped to a parent's subtree: only the parent's descendants (excluding the
// parent itself) are returned, in a single frame group for that frame. The `#N`
// index is computed relative to the subtree (reset per call).
ElementFinder.getElementInventory(document.getElementById('my-section'))
// [ { frame: -1, elements: [ /* only descendants of #my-section */ ] } ]
```

**Key Behaviors**:

- Traverses all same-origin frames; main document is `frame: -1`, iframes `0, 1, …`
- Returns the complete page (no viewport filtering); each element reports `inViewport`
- Optional `parent` (an `Element`): when provided, only that element's descendants are returned (the parent itself is excluded), grouped into a single frame group for the frame the parent lives in. The `#N` positional index is computed relative to that subtree (reset per call), matching `findElements()` ordering within the scope. This mirrors how `findElements(options)` treats `options.parent` as a search root.
- Scoped mode does **not** recurse into same-origin iframes inside the parent's subtree — it returns only the light-DOM + shadow-DOM descendants of the parent in that frame. Use full-page mode (no `parent`) to traverse all frames.
- Frame resolution for scoped parents: when a parent element lives inside a nested iframe (an iframe within an iframe), `findFrameIndexForElement` walks up the ancestor chain (including shadow-DOM hosts) to find a matching frame, rather than defaulting to `-1`.
- `getElementDescriptor(el, includeHidden)` produces the same descriptor the
  inventory uses, so the descriptor and inventory stay consistent
- The `index` for an **identified** element (one with text) is the 1-based
  occurrence within its `(type, text)` group — the first "Submit" button is `1`,
  the second "Submit" button is `2`, and a uniquely-named element resets to `1`.
  This matches the `index` returned by `getElementDescriptor`. The `index` for a
  **text-less** element (no text and no nearby label) is the positional `#N` —
  the 1-based position among same-type elements in the frame, from
  `getElementPositionAmongType`, the same document-order traversal
  `findElements({ type })` returns. The `overlay` entry's `index` mirrors that
  element's own inventory-entry `index` (occurrence within its `(type, text)` group).

---

## 7. Return Format & Metadata

### 7.1 Return Structure

All find functions return a standardized object:

```javascript
{
  elements: [
    {
      element: Element | undefined, // undefined for iframe elements (cross-frame boundary)
      boundingBox: {
        x: number, // Left edge relative to viewport
        y: number, // Top edge relative to viewport
        width: number, // Element width
        height: number, // Element height
        top: number, // Top edge (same as y)
        bottom: number, // Bottom edge (y + height)
        left: number, // Left edge (same as x)
        right: number, // Right edge (x + width)
        midx: number, // Center X coordinate
        midy: number, // Center Y coordinate
        tagName: string, // Lowercase tag name (e.g., 'button')
      },
      frameIndex: number, // -1 for main frame, 0+ for iframes
      tagName: string, // Lowercase tag name (e.g., 'button')
      isHidden: boolean, // true if hidden (display:none, visibility:hidden, hidden attr, inert, or zero dimensions)
      inViewport: boolean, // true if any portion intersects the visual viewport
    },
    // ... more elements
  ]
}
```

### 7.2 Element Reference Safety

```javascript
// Main frame elements: include actual DOM reference
{
  element: <button class="submit">Submit</button>,
  frameIndex: -1
}

// Iframe content: element is undefined (safety boundary)
{
  element: undefined,        // Cannot access cross-frame elements directly
  frameIndex: 0,             // Indicates which iframe this is in
  tagName: 'BUTTON',         // Metadata still available
  boundingBox: {...}         // Coordinates still available
}
```

**Design Rationale**:

- **Safety**: Prevents accidental manipulation of frame content
- **Debugging**: `frameIndex` indicates where to switch context
- **Metadata preserved**: Can still use bounding box for visual verification
- **Agent-friendly**: Agents know they need to switch frames for iframe content

### 7.3 Bounding Box Calculation

```javascript
export function getBoundingBox(element) {
  const rect = element.getBoundingClientRect()

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    midx: rect.x + rect.width / 2,
    midy: rect.y + rect.height / 2,
    tagName: element.tagName.toLowerCase(),
  }
}
```

**Properties Explained**:

- `x`, `y`: Viewport-relative position
- `width`, `height`: Rendered dimensions
- `top`, `bottom`, `left`, `right`: Aliases for clarity
- `midx`, `midy`: Center coordinates (useful for clicking)
- `tagName`: HTML tag name
- `isHidden`: `true` if element is hidden (display:none, visibility:hidden, hidden attribute, inert, or zero dimensions). Note: Zero opacity is NOT considered hidden.
- `inViewport`: `true` if any portion of the element intersects the visual viewport (computed via `getBoundingClientRect()`). Always `false` when `isHidden` is `true` or the element has zero rendered dimensions.

**Usage Example**:

```javascript
const result = ElementFinder.findElements({ type: 'button', text: 'Submit' })
if (result.elements.length > 0) {
  const bbox = result.elements[0].boundingBox

  // Check visibility using isHidden flag
  if (!result.elements[0].isHidden) {
    console.log('Element is visible and can be interacted with')
  }

  // Center coordinates for clicking
  console.log(`Click at (${bbox.midx}, ${bbox.midy})`)

  // Check if visible
  if (bbox.width > 0 && bbox.height > 0) {
    console.log('Element has dimensions')
  }

  // Positioning
  console.log(`Top-left: (${bbox.x}, ${bbox.y})`)
  console.log(`Size: ${bbox.width}x${bbox.height}`)
}
```

**isHidden Detection**:

The `isHidden` flag is determined by walking up the element's ancestors and checking each with `isElementHidden`, which checks (in priority order):

1. `hidden` attribute or `inert` property — always wins
2. `checkVisibility({ checkVisibilityCSS: true })` — the most reliable API (accounts for CSS display, visibility, opacity, clip, and zero-dimension wrappers). If it reports visible, the element is considered visible.
3. CSS `visibility: hidden` / `visibility: collapse` or `display: none` (computed style fallback)
4. When `checkVisibility` is unavailable: `offsetWidth === 0 && offsetHeight === 0` — element has no rendered dimensions

**Note**: Zero opacity is NOT considered hidden. Sites use opacity transitions for lazy-loaded sections that fade in on scroll, and these elements are still laid out and interactable.

**Usage Example**:

```javascript
const result = ElementFinder.findElements({ type: 'button' })
const visibleButtons = result.elements.filter((e) => !e.isHidden)
const hiddenButtons = result.elements.filter((e) => e.isHidden)

console.log(`Found ${visibleButtons.length} visible buttons`)
console.log(`Found ${hiddenButtons.length} hidden buttons`)
```

**inViewport Detection**:

The `inViewport` flag reports whether the element has any visible overlap with the current visual viewport. It is computed synchronously from `getBoundingClientRect()` against `window.visualViewport` (when available) or `window.innerWidth`/`innerHeight`. The flag returns:

- `false` — if the element is `null`, detached, hidden, or has zero rendered dimensions
- `false` — if the element's rect is fully outside the viewport bounds
- `true` — if any portion of the element's rect overlaps the viewport

Two helpers are exported for direct viewport checks:

```javascript
// Synchronous geometry check (returns boolean)
ElementFinder.inViewport(el)

// Synchronous geometry check requiring full containment (no clipping)
ElementFinder.inViewport(el, { fullyVisible: true })

// Synchronous geometry check with minimum intersection ratio (0-1)
ElementFinder.inViewport(el, { threshold: 0.5 })
```

**Usage Example**:

```javascript
const result = ElementFinder.findElements({ type: 'button' })
const onScreen = result.elements.filter((e) => e.inViewport)
const offScreen = result.elements.filter((e) => !e.inViewport)

console.log(`Found ${onScreen.length} buttons currently in viewport`)
console.log(`Found ${offScreen.length} buttons outside the viewport`)
```

---

## 8. Error Handling & Validation

### 8.1 Type Validation

```javascript
export function findElements(
  type = null,
  text = null,
  exact = false,
  parent = null,
) {
  // Validate type parameter
  if (type !== null && type !== undefined && typeof type !== 'string') {
    throw new TypeError(`type must be a string, got ${typeof type}`)
  }

  // Warn for unknown types but don't error
  if (type !== null && type !== undefined && !ELEMENT_DEFINITIONS[type]) {
    console.warn(
      `Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`,
    )
    return { elements: [] }
  }

  // Validate text parameter
  if (
    text !== '' &&
    text !== null &&
    text !== undefined &&
    typeof text !== 'string'
  ) {
    throw new TypeError(`text must be a string, got ${typeof text}`)
  }

  // ... rest of function
}
```

**Validation Strategy**:

- **Programming errors** (TypeError): Throw exception
- **User errors** (unknown type): Warn and return empty results
- **None thrown**: Silent defaults for null/undefined

### 8.2 Parameter Normalization

```javascript
// Empty strings treated as "no filter" (kept as '' so the attribute filter is skipped)
if (text === null || text === undefined) {
  text = ''
}

// null/undefined type normalized to 'element' (find all types) — this applies to
// findElementsByType. In findElements, a null/undefined type is kept as-is and
// matches ANY type (it does not fall back to the generic 'element' type).
if (type === null || type === undefined) {
  type = 'element' // findElementsByType only
}

// parent defaults to null (searches the whole document/frame)
```

### 8.3 Silent Error Handling

Certain errors are expected and handled gracefully:

```javascript
// Cross-origin iframe access
try {
  const iframes = root.document.querySelectorAll('iframe')
  for (const iframe of iframes) {
    const contentWindow = iframe.contentWindow
    // Access contentWindow - may throw SecurityError
  }
} catch (err) {
  // Silently skip cross-origin iframes
  // Results will be incomplete but not error
}

// Restricted shadow roots
try {
  if (node.shadowRoot) {
    // Some elements have restricted shadow roots
    for (const child of node.shadowRoot.children) {
      // Process shadow DOM
    }
  }
} catch (err) {
  // Silently skip - element likely has restricted shadow root
}
```

**When to handle silently**:

- Expected conditions (cross-origin, restricted shadow roots)
- Partial results acceptable (find what you can)
- User needs to debug, not crash

---

## 9. Testing Strategy

### 9.1 Testing Strategy

All tests run in a real Chrome browser via Selenium WebDriver. There are no JSDOM-based unit tests — every test exercises the library in an actual browser environment.

```
                 ▲
              INTEGRATION
            (Real Browser)
           Selenium WebDriver
           Full DOM scenarios
           Shadow DOM, iframes,
           layout, viewport
```

**Test Environment**: Real Chrome browser via Selenium WebDriver

**File Organization**:

```
tests/integration/
├── helpers/
│   └── driver-helper.js        # Selenium setup/teardown
├── animations.test.js          # pauseAnimations/resumeAnimations tests
├── attributes.test.js          # Attribute matching tests
├── edge-cases.test.js          # Null input, cross-frame, etc.
├── element-inventory.test.js   # getElementInventory tests
├── find-elements.test.js       # Combined type + attribute search tests
├── form-state.test.js          # getFormState tests
├── overlay-elements.test.js    # findOverlayElements tests
├── types.test.js               # Type matching & XPath parsing tests
├── viewport.test.js            # inViewport tests
├── element-types.test.js       # Type matching tests
├── dropdowns.test.js           # Dropdown search tests
├── forms.test.js               # Form element tests
├── iframes.test.js             # Cross-frame search tests
├── overlays.test.js            # Overlay detection tests
├── radio-iframe-table.test.js  # Radio/table/iframe tests
├── shadow-dom.test.js          # Shadow DOM traversal tests
├── switches.test.js            # Switch element tests
├── tables.test.js              # Table cell tests
└── fixtures/
    ├── element-types.html      # Test HTML
    ├── forms.html
    └── ...
```

**Element-inventory baselines**: `getElementInventory()` output is validated against committed baselines in `tests/fixtures/element-inventory-baselines/`. Each fixture has a single `<name>.json` baseline generated from real Chrome via Selenium.

`scripts/generate-element-inventory-baselines.js` regenerates all baselines (`npm run test:baselines`). Tests load baselines via `loadElementInventoryBaseline(name)` from `tests/helpers/element-inventory-baseline.js`.

**Example**:

```javascript
// tests/integration/find-elements.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js'

describe('findElements - Combined search', () => {
  const fixture = createDriverFixture({
    url: loadFixture('find-elements.html'),
    injectFinder: true,
    sleep: 500,
  })

  beforeAll(async () => {
    await fixture.setup()
  })

  afterAll(async () => {
    await fixture.teardown()
  })

  it('should find elements matching both type and text', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementFinder.findElements({ type: 'button', text: 'Submit' });
    `)
    expect(result.elements.length).toBe(1)
    expect(result.elements[0].element?.id).toBe('btn1')
  })

  it('should return empty when no element matches both type and text', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementFinder.findElements({ type: 'button', text: 'NonExistent' });
    `)
    expect(result.elements.length).toBe(0)
  })

  it('should support exact matching', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementFinder.findElements({ type: 'button', text: 'Submit', exact: true });
    `)
    expect(result.elements.length).toBe(1)
  })

  it('should handle null parameters (find all)', async () => {
    const result = await fixture.driver.executeScript(`
      return ElementFinder.findElements({});
    `)
    expect(result.elements.length).toBeGreaterThan(0)
  })
})
```

**Running Tests**:

```bash
npm test                    # All tests (builds first, then runs integration tests)
npm test -- find-elements   # Specific file
npm test -- --run          # Run once, don't watch
```

    const result = await driver.executeScript(`
      return ElementFinder.findProbableElements({ type: 'button', text: 'Click Me' });
    `)
    expect(result.elements.length).toBe(1)
    expect(result.elements[0].tagName).toBe('BUTTON')

})

it('should find textbox when label text matches', async () => {
const result = await driver.executeScript(`       return ElementFinder.findProbableElements({ type: 'textbox', text: 'Email' });
    `)
expect(result.elements.length).toBe(1)
expect(result.elements[0].tagName).toBe('INPUT')
})

it('should still find direct matches first', async () => {
const result = await driver.executeScript(`       return ElementFinder.findProbableElements({ type: 'button', text: 'Direct Match Button' });
    `)
// Button with text directly in it should be found
expect(result.elements.length).toBe(1)
})
})

````

**Running Integration Tests**:

```bash
npm test -- tests/integration/     # All integration tests
npm test -- find-probable-elements # Specific suite
npm run test:integration           # Integration tests only
````

### 9.4 Test Coverage Goals

**Current Coverage**:

- **Unit tests**: 37+ tests covering all functions
- **Integration tests**: 16+ tests for findProbableElements fallback
- **Total**: 352+ tests passing

**Coverage Strategy**:

- Type definitions: Each type has unit + integration test
- Attribute matching: Edge cases (empty, null, whitespace)
- Error handling: Type validation, unknown types
- Frame support: Main frame and iframe scenarios
- Shadow DOM: Restricted and open shadow roots

### 9.5 Writing Tests for New Features

**Checklist**:

1. **Add unit test first** (TDD):

   ```javascript
   // tests/unit/find-elements.test.js
   it('should handle your new feature', () => {
     // Arrange: Set up test DOM
     // Act: Call function
     // Assert: Verify behavior
   })
   ```

2. **Add integration test** (if browser behavior matters):

   ```javascript
   // tests/integration/types/your-feature.test.js
   it('should work in real browser scenario', async () => {
     const result = await driver.executeScript(`
       return ElementFinder.yourNewFunction();
     `)
     expect(result).toMatchExpectation()
   })
   ```

3. **Create test fixture** (if needed):

   ```html
   <!-- tests/integration/fixtures/your-feature.html -->
   <html>
     <body>
       <!-- HTML for testing your scenario -->
     </body>
   </html>
   ```

4. **Verify build**:
   ```bash
   npm run build && npm test
   ```

---

## 10. Performance Considerations

### 10.1 Pre-compiled Type Matchers

```javascript
// GOOD: Compile once at module load
const TYPE_MATCHERS = new Map()
for (const [type, expr] of Object.entries(elementDefinitionsData)) {
  TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el))
}

// Usage: O(1) lookup, no compilation
const matcher = TYPE_MATCHERS.get(type)
const matches = matcher(element)
```

**Impact**: ~10-100x faster for searches with repeated types

### 10.2 Stack-Based Traversal (No Recursion)

```javascript
// GOOD: Iterative - no stack depth limit
const stack = [rootNode]
while (stack.length > 0) {
  const node = stack.pop()
  // Process
}

// BAD: Recursive - can hit stack overflow
function traverse(node) {
  // Process node
  for (const child of node.children) {
    traverse(child) // Recursion depth limit
  }
}
```

**Impact**: Handles deeply nested DOMs without crashes

### 10.3 Set-Based Deduplication

```javascript
// GOOD: O(1) lookup with Set
const matchedElements = new Set(matches.map((m) => m.element))
for (const match of matches) {
  if (!excludedElements.has(match.element)) {
    // Keep this match
  }
}

// BAD: O(n) lookup with array
for (const match of matches) {
  if (!excludedElements.includes(match.element)) {
    // Keep this match - linear search!
  }
}
```

**Impact**: 100x faster for large DOM trees

### 10.4 Early Exit Conditions

```javascript
// GOOD: Check faster conditions first
for (const el of domElements) {
  // Type check is fast (usually more restrictive)
  if (type !== null && !matchesType(el, type)) continue
  // Text check is slower (attribute traversal)
  if (text !== '' && !matchesAttribute(el, text)) continue
  // Both conditions match
  matches.push(el)
}

// BAD: Check expensive conditions first
for (const el of domElements) {
  if (text !== '' && !matchesAttribute(el, text)) continue
  if (type !== null && !matchesType(el, type)) continue
}
```

**Impact**: 2-3x faster on typical DOMs

### 10.5 Parent Parameter for Scoped Searches

```javascript
// GOOD: Search within a container
const form = document.getElementById('login-form')
const result = findElements({ type: 'textbox', parent: form })
// Only searches within form, not entire document

// BAD: Search entire document every time
const result = findElements({ type: 'textbox', parent: document.body })
// Searches entire page even if you only need form fields
```

**Impact**: Proportional to DOM size (10-100x faster for large pages)

### 10.6 Performance Benchmarks

Typical performance on modern hardware:

```
Operation                    Time
────────────────────────────────────
findElementsByType({ type: 'button' })   2-5ms      (10 buttons on page)
findElements({ type: 'button', text: 'OK' })  3-8ms      (direct match)
findProbableElements({ type: 'button', text: 'Click' })     8-15ms     (includes fallback search)
Shadow DOM traversal          5-20ms     (varies by depth)
Multi-frame search            10-50ms    (depends on iframe count)
```

**Optimization Tips**:

1. Use `parent` parameter to narrow scope
2. Use type-only search if text not needed
3. Cache results if searching multiple times
4. Profile with Chrome DevTools to identify bottlenecks

---

## 11. Build & Distribution

### 11.1 Build Process

The library is built into two IIFE bundles (a global `ElementFinder` is exposed for browser injection):

```bash
npm run build
# Creates:
# - index.js      (IIFE bundle, unminified)
# - index.min.js  (IIFE bundle, minified)
```

**Build Tool**: esbuild

**Configuration** (build.js):

```javascript
import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/element-finder.js'],
  bundle: true,
  format: 'esm',
  outfile: 'index.js',
  sourcemap: false,
  logLevel: 'info',
})

// Also create minified version
esbuild.build({
  entryPoints: ['src/element-finder.js'],
  bundle: true,
  format: 'esm',
  outfile: 'index.min.js',
  minify: true,
  logLevel: 'info',
})
```

**Why Both Versions**:

- `index.js`: Better for debugging (readable code)
- `index.min.js`: Better for production (smaller size)

### 11.2 Module Exports

Main entry point exports:

```javascript
// Search functions
export { findElementsByType }
export { findElementsByAttribute }
export { findElements }
export { findProbableElements }
export { findOverlayElements }

// Counting & inventory
export { getElementCounts }
export { getViewportElementCounts }
export { getElementInventory }
export { getElementDescriptor }
export { getFormState }

// Utilities
export { getAllElements }
export { getAllFrames }
export { getBoundingBox }
export { inViewport }
export { isHidden }
export { matchesAttribute }
export { matchesType }
export { parseXPath }
export { parseCondition }
export { splitByOperator }

// Configuration
export { ELEMENT_DEFINITIONS }
export { setSearchableAttributes }
export { getSearchableAttributes }
export { getSearchableAttributeValues }
export { setIgnoredTags }
export { getIgnoredTags }
export { addIgnoredTags }
export { removeIgnoredTags }

// Inspection
export { getValidTypes }
export { getValidAttributes }

// Animation control
export { pauseAnimations }
export { resumeAnimations }

// Debugging
export { highlight }
export { unhighlight }
```

### 11.3 Browser Distribution

The library is distributed as an NPM package with multiple export formats:

```json
{
  "exports": {
    ".": {
      "import": "./src/element-finder.js",
      "default": "./src/element-finder.js"
    },
    "./browser": "./index.js",
    "./min": "./index.min.js",
    "./element-definitions.json": {
      "default": "./src/element-definitions.json"
    },
    "./searchable-attributes.json": {
      "default": "./src/searchable-attributes.json"
    }
  }
}
```

**Usage**:

```javascript
// ESM source entry point (bundlers and Node ESM)
import * as ElementFinder from '@nodebug/browser-element-finder'

// Browser IIFE bundle (creates global ElementFinder)
import '@nodebug/browser-element-finder/browser'

// Minified browser IIFE bundle
import '@nodebug/browser-element-finder/min'

// Configuration files
import definitions from '@nodebug/browser-element-finder/element-definitions.json'
import attributes from '@nodebug/browser-element-finder/searchable-attributes.json'
```

### 11.4 Version Management

**Current Version**: 1.3.5

**Versioning Strategy**: Semantic versioning

- MAJOR: Breaking API changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**Recent Changes**:

- v1.3.x: Added `getElementInventory`, `getElementDescriptor`, `getFormState`, `getViewportElementCounts`, ignored-tag configuration (`setIgnoredTags`/`addIgnoredTags`/`removeIgnoredTags`/`getIgnoredTags`), and `getSearchableAttributeValues`
- v1.1.0: Added `findProbableElements` function
- v1.0.0: Initial release

---

## 12. Configuration Files

### 11.1 element-definitions.json

Maps semantic type names to XPath-like expressions.

**Structure**:

```json
{
  "type-name": "xpath-expression",
  "button": "self::button or @role='button' or @type='button' or @type='submit'",
  "element": "true()"
}
```

**Modification Strategy**:

1. **Add new type**:

   ```json
   {
     "mytype": "self::custom or @role='mytype'"
   }
   ```

   - Add to element-definitions.json
   - Test with unit test
   - Rebuild and commit

2. **Extend existing type**:

   ```json
   {
     "button": "self::button or @role='button' or ... or @data-button='true'"
   }
   ```

   - Add new condition with `or`
   - Respects existing matches
   - May capture more false positives (consider carefully)

3. **Debugging type definition**:

   ```javascript
   const type = 'button'
   const expr = ELEMENT_DEFINITIONS[type]
   console.log(`Type '${type}' matches: ${expr}`)

   // Test against element
   const matched = ElementFinder.matchesType(element, 'button')
   console.log(`Element matches 'button': ${matched}`)
   ```

### 11.2 searchable-attributes.json

Priority order for attribute searching. Attributes are checked in this order until a match is found.

**Structure**:

```json
[
  "placeholder",
  "value",
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

**Modification Strategy**:

1. **Change priority** (reorder array):

   ```json
   [
     "data-qa", // Your project's test ID first
     "data-testid",
     "id",
     "aria-label"
   ]
   ```

   - Modify the order in JSON
   - Set with `ElementFinder.setSearchableAttributes(...)`
   - Persists for lifetime of script context

2. **Add project-specific attribute**:

   ```json
   [
     "data-qa", // Add custom attribute
     "data-test-id",
     "data-testid",
     "id"
   ]
   ```

   - Insert in appropriate position
   - Rebuild
   - Test with your element structure

3. **Query current attributes**:

   ```javascript
   const attrs = ElementFinder.getSearchableAttributes()
   console.log('Searching attributes in order:', attrs)
   // ['data-testid', 'id', 'aria-label', ...]
   ```

4. **Inspect current values on an element**:
   ```javascript
   const values = ElementFinder.getSearchableAttributeValues(
     document.querySelector('input'),
   )
   console.log(values)
   // { placeholder: 'Email', 'data-testid': 'email-input' }
   ```

### 11.3 vitest.config.js

Test runner configuration.

**Key Settings**:

```javascript
export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 120000,
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
    },
  },
})
```

**Modification**:

- Add environment variable support
- Configure test timeout
- Add more reporters
- Set up test filtering

### 11.4 eslint.config.js

Code quality configuration.

**Current Rules**:

- No unused variables
- Consistent spacing
- Proper semicolons
- Standard naming conventions

**Modifying Rules**:

```javascript
rules: {
  'no-unused-vars': 'error',
  'indent': ['error', 2],
  'semi': ['error', 'always'],
  'quotes': ['error', 'single']
}
```

---

## 13. Known Limitations & Edge Cases

### 12.1 Iframe Restrictions

**Same-Origin Policy**:

```javascript
// CAN access (same origin)
<iframe src="page.html"></iframe>
// Can search content via contentWindow.document

// CANNOT access (cross-origin)
<iframe src="https://different-domain.com"></iframe>
// SecurityError thrown when accessing contentWindow
// Frame is silently skipped in results
```

**Design**:

- Errors are caught and logged as warnings
- Search continues with remaining frames
- Results are partial but not empty

**Workaround**:

```javascript
// For cross-origin frames, must inject script separately
// Use Selenium's switch_to.frame() or similar to enter context
driver.switch_to.frame(frameElement)
// Now ElementFinder searches within that frame context
```

### 12.2 Shadow DOM

**Supported**:

- ✅ Open shadow roots: Fully searchable
- ✅ Custom elements with shadow DOM
- ✅ Style encapsulation (CSS doesn't affect search)

**Restricted**:

- ❌ Closed shadow roots: Cannot access
- ❌ System elements: `<video>`, `<input type="date">` have restricted roots
- ❌ Browser internals: Search stops at boundary

**Example**:

```javascript
// Custom element with open shadow root
const custom = document.createElement('custom-element')
custom.attachShadow({ mode: 'open' })
// ElementFinder can traverse and search here ✅

// Closed shadow root
custom.attachShadow({ mode: 'closed' })
// ElementFinder cannot access ❌
```

### 12.3 Text Matching Behavior

**Case Sensitivity**:

```javascript
// Text matching is ALWAYS case-sensitive
findElements({ text: 'Submit' }) // Matches "Submit" and "Re-Submit"
findElements({ text: 'SUBMIT' }) // Does NOT match "Submit"

// Workaround: Convert text before searching
const lower = 'submit'.toLowerCase()
// Or: Don't use text-based identification (use type instead)
```

**Whitespace Handling**:

```javascript
// Whitespace is NOT normalized
const el = document.createElement('button')
el.textContent = '  Submit  '

findElements({ text: 'Submit' }) // Does NOT match (spaces differ)
findElements({ text: '  Submit  ' }) // Matches exactly
findElements({ text: 'ubmit' }) // Matches (substring match)

// Workaround: Use exact: false and include whitespace
findElements({ text: ' Submit ', exact: false })
```

**Nested Content**:

```javascript
// Full text content includes ALL nested text
const html = `
  <button>
    <span>Click</span>
    <span>Me</span>
  </button>
`

findElements({ type: 'button', text: 'Click' }) // Matches (contains "Click")
findElements({ type: 'button', text: 'Me' }) // Matches (contains "Me")
findElements({ type: 'button', text: 'ClickMe' }) // Matches (concatenated text)
```

### 12.4 Type Matching Edge Cases

**No Partial Matches**:

```javascript
// Type must fully match expression
const expr = "self::button or @role='button'"
const el = document.createElement('div')
el.role = 'button'

// This matches (second condition true)
ElementFinder.matchesType(el, 'button') // true

// But this does NOT match (first condition false)
const el2 = document.createElement('div')
// Neither self::button nor @role='button' matches
ElementFinder.matchesType(el2, 'button') // false
```

**Performance Implications**:

```javascript
// Simple types are fast
matchesType(el, 'button') // ✅ Fast (few conditions)

// Complex types are slower
matchesType(el, 'dropdown') // ⚠️ Slower (many nested conditions)

// Check type once if possible, reuse matcher
const typeMatches = []
for (const el of elements) {
  if (matchesType(el, 'dropdown')) {
    typeMatches.push(el)
  }
}
```

### 12.5 Memory Considerations

**Large DOMs**:

```javascript
// Searching entire page with 10,000+ elements
const result = findElements({}) // Loads all elements into array
// Uses ~10-50MB memory (depends on element data)

// Optimize: Search within container
const container = document.getElementById('app')
const result = findElements({ parent: container })
// Reduces memory proportionally
```

**Recursive Depth**:

```javascript
// XPath expressions limited to 100 recursion depth
const deepExpr = '((((((((((a))))))))))'
// Prevents stack overflow from malformed expressions

// Normal expressions safe (max ~5 levels nesting in practice)
const expr = "(self::button or @role='button')" // ✅ Fine
```

---

## 14. Common Usage Patterns

### 13.1 Click a Button by Text

```javascript
async function clickButton(text) {
  const result = ElementFinder.findElements({ type: 'button', text })
  if (result.elements.length === 0) {
    throw new Error(`Button with text "${text}" not found`)
  }

  const button = result.elements[0].element
  button.click()

  // Or in Selenium
  await driver.executeScript(`
    const result = ElementFinder.findElements({ type: 'button', text: '${text}' });
    result.elements[0].element.click();
  `)
}

// Usage
await clickButton('Submit')
```

### 13.2 Fill Form Input

```javascript
async function fillInput(label, value) {
  const result = ElementFinder.findProbableElements({
    type: 'textbox',
    text: label,
  })
  if (result.elements.length === 0) {
    throw new Error(`Textbox with label "${label}" not found`)
  }

  const input = result.elements[0].element
  input.value = value
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

// Usage
await fillInput('Email', 'test@example.com')
```

### 13.3 Verify Element Visibility

```javascript
function isElementVisible(type, text) {
  const result = ElementFinder.findElements({ type, text })
  if (result.elements.length === 0) return false

  const bbox = result.elements[0].boundingBox
  return bbox.width > 0 && bbox.height > 0
}

// Usage
if (isElementVisible('button', 'Submit')) {
  console.log('Submit button is visible')
}
```

### 13.4 Count Matching Elements

```javascript
function countElements(type, text = null) {
  const result = ElementFinder.findElements({ type, text })
  return result.elements.length
}

// Usage
const buttonCount = countElements('button') // All buttons
const submitCount = countElements('button', 'Submit') // Submit buttons
```

### 13.5 Get Element Position

```javascript
function getElementCenter(type, text) {
  const result = ElementFinder.findElements({ type, text })
  if (result.elements.length === 0) return null

  const bbox = result.elements[0].boundingBox
  return { x: bbox.midx, y: bbox.midy }
}

// Usage
const pos = getElementCenter('button', 'Checkout')
console.log(`Click at (${pos.x}, ${pos.y})`)
```

### 13.6 Search Within Container

```javascript
async function findInDialog(type, text) {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) {
    throw new Error('Dialog not found')
  }

  const result = ElementFinder.findElements({ type, text, parent: dialog })
  return result.elements
}

// Usage
const buttons = await findInDialog('button', 'OK')
```

### 13.7 Highlight Found Elements (for debugging)

```javascript
function highlightElements(type, text) {
  const result = ElementFinder.findElements({ type, text })
  const elements = result.elements.map((r) => r.element).filter((el) => el) // Filter out iframe content

  ElementFinder.highlight(elements)

  // Remove after 5 seconds
  setTimeout(() => {
    ElementFinder.unhighlight(elements)
  }, 5000)
}

// Usage
highlightElements('button', 'Submit') // Shows highlighted buttons for 5 sec
```

### 13.8 List All Element Types Found

```javascript
function inventoryElements() {
  const types = ElementFinder.getValidTypes()
  const inventory = {}

  for (const type of types) {
    const result = ElementFinder.findElementsByType({ type })
    inventory[type] = result.elements.length
  }

  return inventory
}

// Usage
const counts = inventoryElements()
console.log(counts)
// {
//   button: 15,
//   textbox: 8,
//   link: 42,
//   ...
// }
```

### 13.8 List All Searchable Attributes

```javascript
function listSearchableAttributes() {
  const attrs = ElementFinder.getValidAttributes()
  console.log('Searchable attributes:', attrs)
  return attrs
}

// Usage
listSearchableAttributes()
// ['placeholder', 'value', 'data-test-id', 'data-testid', 'id', ...]
```

### 13.9 Handle Multi-Frame Results

```javascript
function processAllResults(result) {
  const mainFrameElements = result.elements.filter((r) => r.frameIndex === -1)
  const iframeElements = result.elements.filter((r) => r.frameIndex >= 0)

  console.log(`Found in main frame: ${mainFrameElements.length}`)
  console.log(`Found in iframes: ${iframeElements.length}`)

  // Process main frame
  mainFrameElements.forEach((r) => {
    r.element.style.border = '2px solid red'
  })

  // iframeElements don't have element reference
  // Would need to switch frame context to interact
}
```

---

## 15. Development Workflow

### 14.1 Setting Up Development Environment

**Prerequisites**:

- Node.js ≥ 24
- Git
- Chrome browser (for integration tests)

**Setup**:

```bash
# Clone repository
git clone https://github.com/node-bug/browser-element-finder.git
cd browser-element-finder

# Install dependencies
npm install

# Verify setup
npm test                    # Should pass all tests
npm run build               # Should create index.js and index.min.js
```

### 14.2 Adding a New Element Type

**Step 1**: Add to element-definitions.json

```json
{
  "breadcrumb": "self::nav[@aria-label='breadcrumb'] or @role='navigation' and contains(@class, 'breadcrumb')"
}
```

**Step 2**: Create integration test

```javascript
// tests/integration/types.test.js
it('should match breadcrumb navigation', async () => {
  const result = await fixture.driver.executeScript(`
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'breadcrumb');
    const a = document.createElement('a');
    a.href = '/';
    a.textContent = 'Home';
    nav.appendChild(a);
    document.body.appendChild(nav);
    return ElementFinder.findElementsByType({ type: 'breadcrumb' });
  `)
  expect(result.elements.length).toBe(1)
})
```

**Step 3**: Run tests

```bash
npm test -- tests/integration/types.test.js
```

**Step 4**: Create integration test

```javascript
// tests/integration/types/breadcrumb.test.js
it('should find breadcrumb in page', async () => {
  const result = await driver.executeScript(`
    return ElementFinder.findElementsByType({ type: 'breadcrumb' });
  `)
  expect(result.elements.length).toBeGreaterThan(0)
})
```

**Step 5**: Build and test

```bash
npm run build
npm test
```

**Step 6**: Commit

```bash
git add src/element-definitions.json tests/
git commit -m "feat: add breadcrumb element type"
```

### 14.3 Modifying Search Behavior

**Example**: Make attribute search case-insensitive

**Step 1**: Update unit test first

```javascript
it('should match case-insensitive text', () => {
  // This test will fail initially (TDD)
  const result = findElements({ text: 'SUBMIT' })
  // Should match "Submit" button
  expect(result.elements.length).toBeGreaterThan(0)
})
```

**Step 2**: Run test to see failure

```bash
npm test -- tests/unit/find-elements.test.js
# FAIL: case-insensitive test
```

**Step 3**: Implement the feature

```javascript
// In matchesAttribute or parseCondition
const attrValue = el.getAttribute(attr).toLowerCase()
const searchValue = value.toLowerCase()
return exact ? attrValue === searchValue : attrValue.includes(searchValue)
```

**Step 4**: Run test again

```bash
npm test -- tests/unit/find-elements.test.js
# PASS: case-insensitive test
```

**Step 5**: Run all tests to check for regressions

```bash
npm test
# Ensure all 350+ tests still pass
```

### 14.4 Debugging Issues

**Enable Detailed Logging**:

```javascript
// Add to your test or script
ElementFinder.debug = true

// Or in element-finder.js
const DEBUG = true

if (DEBUG) {
  console.log(`Checking type '${type}' against element ${el.tagName}`)
  console.log(`  Result: ${matchesType(el, type)}`)
}
```

**Test Individual Functions**:

```javascript
// Integration test to isolate problem — inject into real browser
const result = await driver.executeScript(`
  const html = '<button id="test">Click</button>'
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const button = document.getElementById('test')
  return {
    matchesType: ElementFinder.matchesType(button, 'button'),
    matchesAttribute: ElementFinder.matchesAttribute(button, 'Click'),
    parseXPath: ElementFinder.parseXPath('self::button', button),
  }
`)
console.log('matchesType:', result.matchesType)
console.log('matchesAttribute:', result.matchesAttribute)
console.log('parseXPath:', result.parseXPath)
```

**Check Type Definitions**:

```javascript
// Verify a type is defined correctly
console.log('button type expression:')
console.log(ElementFinder.ELEMENT_DEFINITIONS.button)

// Test the expression
const expr = ElementFinder.ELEMENT_DEFINITIONS.button
console.log('Parsed correctly:', ElementFinder.parseXPath(expr, element))
```

### 14.5 Performance Testing

**Benchmark Search Time**:

```javascript
function benchmark(fn, iterations = 100) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return (end - start) / iterations
}

// Measure average search time
const avgTime = benchmark(() => {
  ElementFinder.findElements({ type: 'button', text: 'Submit' })
}, 100)

console.log(`Average search time: ${avgTime.toFixed(2)}ms`)
```

**Profile with DevTools**:

```javascript
// In browser console
performance.mark('search-start')
ElementFinder.findElements({ type: 'button', text: 'Submit' })
performance.mark('search-end')
performance.measure('search', 'search-start', 'search-end')

// View in Performance tab
const measure = performance.getEntriesByName('search')[0]
console.log(`Search took ${measure.duration.toFixed(2)}ms`)
```

---

## 16. Troubleshooting Guide

### 15.1 Element Not Found

**Diagnosis Checklist**:

1. **Is the element rendered?**

   ```javascript
   const result = ElementFinder.findElements({ type: 'button', text: 'Submit' })
   if (result.elements.length === 0) {
     // Check if element exists and is visible
     const button = document.querySelector('button')
     console.log('Button exists:', !!button)
     console.log('Button text:', button?.textContent)
     console.log('Button visible:', button?.offsetHeight > 0)
   }
   ```

2. **Is it in an iframe?**

   ```javascript
   // Check frameIndex in results
   if (result.elements.length > 0) {
     const frameIndex = result.elements[0].frameIndex
     if (frameIndex >= 0) {
       console.log(`Element is in iframe ${frameIndex}`)
       // Need to switch frame context to interact
     }
   }
   ```

3. **Is the text exact?**

   ```javascript
   // Try different text variations
   ElementFinder.findElements({ type: 'button', text: 'Submit' })
   ElementFinder.findElements({ type: 'button', text: 'submit' }) // Case sensitive!
   ElementFinder.findElements({ type: 'button', text: 'Submit ' }) // Whitespace matters!
   ElementFinder.findElements({ type: 'button', text: 'Sub' }) // Substring match
   ```

4. **Is it in shadow DOM?**

   ```javascript
   // Check elements with shadow roots
   const custom = document.querySelector('custom-element')
   if (custom?.shadowRoot) {
     console.log('Found shadow root')
     // ElementFinder should traverse it automatically
   }
   ```

5. **Is the type correct?**

   ```javascript
   // List valid types
   console.log('Valid types:', ElementFinder.getValidTypes())

   // Check if element matches type
   const button = document.querySelector('button')
   console.log(
     'Matches button type:',
     ElementFinder.matchesType(button, 'button'),
   )
   ```

### 15.2 Getting Different Results Than Expected

**Issue**: `findElements` returns different results than `findProbableElements`

```javascript
const strict = ElementFinder.findElements({ type: 'button', text: 'Click' })
const probable = ElementFinder.findProbableElements({
  type: 'button',
  text: 'Click',
})

if (strict.elements.length !== probable.elements.length) {
  // Probable found nearby elements
  console.log('Strict found:', strict.elements.length)
  console.log('Probable found:', probable.elements.length)

  // The difference is from fallback search
  const fallbackElements = probable.elements.filter(
    (el) => !strict.elements.find((s) => s.element === el.element),
  )
  console.log('From fallback:', fallbackElements.length)
}
```

**Why This Happens**:

- `findElements`: Requires element to directly contain the text
- `findProbableElements`: Also finds nearby elements with that text

**Solution**:

- Use `findProbableElements` for flexible matching
- Use `findElements` only when strict matching is needed

### 15.3 Type Definition Not Working

**Example**: Added new type but it's not being found

```javascript
// Test the type expression directly
const expr = ElementFinder.ELEMENT_DEFINITIONS['mytype']
console.log('Expression:', expr)

// Test against an element
const element = document.querySelector('[data-mytype]')
console.log('Element:', element)

// Parse the expression manually
const result = ElementFinder.parseXPath(expr, element)
console.log('Matches:', result)

// If false, debug the expression parsing
ElementFinder.parseCondition('@data-mytype', element) // Should be true
```

**Common Issues**:

- **Typo in JSON**: `"mytype"` vs `"my-type"`
- **Invalid syntax**: `self::customtag` (should be lowercase after ::)
- **Wrong attribute name**: `@custom` vs `@data-custom`

### 15.4 Performance Issues

**Symptom**: Searches are slow on large pages

**Solutions**:

1. **Use parent parameter**:

   ```javascript
   // Instead of:
   ElementFinder.findElements({ type: 'button', text: 'Submit' }) // Searches entire page

   // Do:
   const form = document.getElementById('form')
   ElementFinder.findElements({ type: 'button', text: 'Submit', parent: form }) // Searches form only
   ```

2. **Use type-only search if possible**:

   ```javascript
   // Instead of:
   ElementFinder.findElements({ type: 'button', text: 'Submit' })

   // If you know the text, maybe:
   ElementFinder.findElementsByType({ type: 'button' }) // If text not needed
   ```

3. **Cache results**:

   ```javascript
   const buttonCache = new Map()

   function getCachedButton(text) {
     if (!buttonCache.has(text)) {
       buttonCache.set(
         text,
         ElementFinder.findElements({ type: 'button', text }),
       )
     }
     return buttonCache.get(text)
   }
   ```

4. **Profile to find bottleneck**:
   ```javascript
   console.time('search')
   const result = ElementFinder.findElements({ type: 'button', text: 'Submit' })
   console.timeEnd('search') // Tells you how long search took
   ```

### 15.5 Cross-Origin Iframe Issues

**Issue**: Cannot find elements in cross-origin iframe

```javascript
const result = ElementFinder.findElements({ type: 'button' })
// Results only from main frame, not cross-origin iframes

// Check what frames were searched
result.elements.forEach((el) => {
  if (el.frameIndex >= 0) {
    console.log(`Element in iframe ${el.frameIndex}`)
  }
})
```

**Solution**:

```javascript
// Switch frame context in Selenium before searching
await driver.switch_to.frame(iframeElement)

// Now ElementFinder searches within that frame
const result = await driver.executeScript(`
  return ElementFinder.findElements({ type: 'button', text: 'Submit' });
`)

// Switch back to main frame
await driver.switch_to.default_content()
```

### 15.6 Shadow DOM Content Not Found

**Issue**: Elements in shadow DOM not being found

```javascript
// Check if shadow root is accessible
const custom = document.querySelector('custom-element')
if (custom.shadowRoot) {
  console.log('Shadow root is accessible')
  // ElementFinder should find it
} else {
  console.log('Shadow root is closed or not attached')
  // Cannot search closed shadow roots
}
```

**Workaround for closed shadow roots**:

```javascript
// Can't access shadow DOM directly
// Instead, test the public API of the component

// Example: custom <date-picker> element
const picker = document.querySelector('date-picker')
const value = picker.value // Access through public property

// Or use Selenium to find via accessible tree
const result = await driver.executeScript(`
  // The custom element itself is searchable by type
  return ElementFinder.findElementsByType({ type: 'element' });
  // Then filter for custom-element tags
`)
```

### 15.7 Memory Leaks

**Issue**: Search results causing memory buildup

```javascript
// Problem: Storing many results without cleanup
const allResults = []
for (let i = 0; i < 1000; i++) {
  allResults.push(ElementFinder.findElements({ type: 'button' }))
}
// Holds references to 1000 large result objects

// Solution: Clear results when done
allResults.length = 0
// Or use scoped results
{
  const result = ElementFinder.findElements({ type: 'button' })
  // Use result
}
// result is garbage collected when scope ends
```

---

## Appendix A: API Reference

### Quick Reference

| Function                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Example                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findElementsByType(options)`           | Find by semantic type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `findElementsByType({ type: 'button' })`                                                                                                                                                                        |
| `findElementsByAttribute(options)`      | Find by text/attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `findElementsByAttribute('Submit')`                                                                                                                                                                             |
| `findElements(options)`                 | Strict combined search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `findElements({ type: 'button', text: 'Submit' })`                                                                                                                                                              |
| `findProbableElements(options)`         | Flexible combined search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `findProbableElements({ type: 'button', text: 'Click' })`                                                                                                                                                       |
| `matchesType(el, type)`                 | Check if element matches type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `matchesType(button, 'button')` → true                                                                                                                                                                          |
| `matchesAttribute(el, value, exact)`    | Check if element matches attribute/text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `matchesAttribute(button, 'OK')` → true                                                                                                                                                                         |
| `getBoundingBox(element)`               | Get element position and size                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `getBoundingBox(button)` → { x: 10, y: 20, ... }                                                                                                                                                                |
| `getAllElements(root)`                  | Get all elements (flat list)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `getAllElements(document.body)` → [...]                                                                                                                                                                         |
| `getAllFrames(root)`                    | Get all frames recursively                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `getAllFrames()` → [{ window, document, frameIndex }, ...]                                                                                                                                                      |
| `parseXPath(expr, el)`                  | Parse XPath-like expression                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `parseXPath('self::button', el)` → true                                                                                                                                                                         |
| `highlight(elements)`                   | Highlight elements red                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `highlight([button1, button2])`                                                                                                                                                                                 |
| `unhighlight(elements)`                 | Remove highlight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `unhighlight([button1, button2])`                                                                                                                                                                               |
| `getValidTypes()`                       | List all element types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `getValidTypes()` → ['button', 'textbox', ...]                                                                                                                                                                  |
| `getValidAttributes()`                  | List all valid searchable attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `getValidAttributes()` → ['placeholder', 'value', ...]                                                                                                                                                          |
| `getSearchableAttributes()`             | List attribute search order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `getSearchableAttributes()` → ['data-testid', ...]                                                                                                                                                              |
| `setSearchableAttributes(array)`        | Set attribute search order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `setSearchableAttributes(['data-qa', ...])`                                                                                                                                                                     |
| `getSearchableAttributeValues(element)` | Inspect non-empty searchable attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `getSearchableAttributeValues(input)` → { id: 'email' }                                                                                                                                                         |
| `getElementCounts(options)`             | Count elements by type and visibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `getElementCounts({ type: 'button' })` → `{ button: { visible: 3, ... } }`                                                                                                                                      |
| `getViewportElementCounts(options)`     | Count viewport-visible elements by type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `getViewportElementCounts()` → `{ button: { visible: 2, ... } }`                                                                                                                                                |
| `getElementInventory(parent)`           | Frame-grouped object snapshot `{type, description, inViewport, isHidden, formState, index}`; each frame group also carries `overlay` (`{type, description, inViewport, isHidden, formState, index}` of the visible overlay with the most inventory descendants, or `null`). Identified elements use a `(type, text)` occurrence `index`; text-less elements use the positional `#N`. Always-on text-less `#N` + form state + nearby-label rescue. Optional `parent` scopes the result to that element's descendants (single frame group) | `getElementInventory()` → `[ { frame: -1, elements: [ { type, description, inViewport, isHidden, formState, index }, ... ], overlay: { type, description, inViewport, isHidden, formState, index } \| null } ]` |
| `inViewport(el, options)`               | Check if element is in viewport (sync)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `inViewport(el)` → true/false                                                                                                                                                                                   |
| `isHidden(el)`                          | Check if element is hidden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `isHidden(el)` → true/false                                                                                                                                                                                     |

---

## Appendix B: Element Types Quick Reference

```
INTERACTIVE ELEMENTS
  button      - Clickable buttons and button-like elements
  link        - Hyperlinks and link-like elements
  textbox     - Input fields and textareas
  checkbox    - Checkboxes
  radio       - Radio buttons
  switch      - Toggle switches
  slider      - Range inputs and sliders
  dropdown    - Select dropdowns and comboboxes
  file        - File input elements

CONTENT ELEMENTS
  link        - Hyperlinks
  heading     - Headings (h1-h6)
  image       - Images
  text        - Text content (planned)

STRUCTURE ELEMENTS
  table       - Tables
  row         - Table rows
  cell        - Table cells
  column      - Table columns
  list        - Lists (ul, ol)
  listitem    - List items
  menu        - Menus
  menuitem    - Menu items
  toolbar     - Toolbars
  dialog      - Dialogs
  navigation  - Navigation elements

UNIVERSAL
  element     - Any element (matches all)
```

---

## Appendix C: Glossary

- **XPath-like expression**: Simplified XPath syntax for element matching (not full XPath)
- **Innermost match**: Most specific element (leaf node, not container)
- **Fallback search**: Secondary search strategy when primary strategy finds nothing
- **Frame**: Browser context (main window or iframe)
- **Shadow DOM**: Encapsulated DOM tree attached to an element
- **Bounding box**: Element's position and size relative to viewport
- **Semantic type**: Human-readable element classification (button, textbox, etc.)
- **Searchable attribute**: Attribute checked when matching element by text

---

## Document History

| Date      | Version | Changes                                                                                                                                                               |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| June 2026 | 1.3.5   | Added `getElementInventory`, `getElementDescriptor`, `getFormState`, `getViewportElementCounts`, ignored-tag config, and `getSearchableAttributeValues` documentation |
| June 2026 | 1.1.7   | Added `getValidAttributes()` documentation                                                                                                                            |
| May 2026  | 1.1.1   | Added `findProbableElements` documentation                                                                                                                            |
| May 2026  | 1.1.0   | Initial engineering documentation                                                                                                                                     |

---

**For questions or clarifications about this document, refer to the actual source code in `src/element-finder.js` or create an issue on GitHub.**
