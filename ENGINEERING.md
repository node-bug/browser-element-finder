# Engineering Documentation: Browser Element Finder

**Version**: 1.3.4  
**Last Updated**: June 2026  
**Purpose**: Complete technical reference for developing, maintaining, and extending the browser-element-finder library.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Patterns](#2-architecture--design-patterns)
3. [Element Type System](#3-element-type-system)
4. [Attribute Matching Strategy](#4-attribute-matching-strategy)
5. [The Four Search Functions](#5-the-four-search-functions)
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
ElementFinder.findElementsByType('button')

// Case 2: Attribute-only search (find anything with text "Submit")
ElementFinder.findElementsByAttribute('Submit')

// Case 3: Strict combined search (find a button WITH text "Submit")
ElementFinder.findElements('button', 'Submit')

// Case 4: Probabilistic search (find a button, but nearby text "Submit" is OK)
ElementFinder.findProbableElements('button', 'Submit')
```

### 1.3 Project Structure

```
browser-element-finder/
├── src/
│   ├── element-finder.js              # Main canonical implementation
│   ├── element-finder-by-type.js      # Standalone type-only finder
│   ├── element-finder-by-attribute.js # Standalone attribute-only finder
│   ├── element-definitions.json       # Type → XPath mapping
│   └── searchable-attributes.json     # Attribute search priority
├── tests/
│   ├── unit/                          # Fast JSDOM tests
│   │   ├── find-elements.test.js
│   │   ├── attributes.test.js
│   │   └── types.test.js
│   └── integration/                   # Real browser Selenium tests
│       ├── types/
│       ├── attributes/
│       └── fixtures/
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

**Why Three Modules?**

1. **element-finder-by-type.js** - Focused implementation for type-only searches
2. **element-finder-by-attribute.js** - Focused implementation for attribute-only searches
3. **element-finder.js** - Combined canonical module incorporating both

**Rationale**:

- Allows specialized use cases to have minimal dependencies
- Provides reference implementations for testing logic isolation
- Combined module reuses proven logic rather than duplicating

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
  frames.push({
    window: root,
    document: root.document,
    isMainFrame: true,
    frameIndex: -1,
  })

  // Recursively search iframes
  try {
    const iframes = root.document.querySelectorAll('iframe')
    let frameIndex = 0

    for (const iframe of iframes) {
      frames.push({
        window: iframe.contentWindow,
        document: iframe.contentDocument,
        isMainFrame: false,
        frameIndex: frameIndex++,
      })

      // Recursively get frames within this iframe
      const nestedFrames = getAllFrames(iframe.contentWindow)
      frames.push(...nestedFrames.slice(1)) // Skip main frame of nested
    }
  } catch (err) {
    // Silently ignore cross-origin access errors
  }

  return frames
}
```

**Design Rationale**:

- **Same-origin only**: Cross-origin iframes throw SecurityError, caught and skipped
- **Recursive structure**: Handles nested iframes and frames within frames
- **Metadata tracking**: Each frame includes its index for debugging and context switching
- **Graceful degradation**: Partial results from accessible frames if some are cross-origin

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
  "button": "self::button or @role='button' or @type='button' or @type='submit'",
  "textbox": "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email' or @type='number' or @type='tel' or @type='url')) or @role='textbox'",
  "checkbox": "(self::input and @type='checkbox') or @role='checkbox'",
  "switch": "(self::input and @type='checkbox') or @role='switch' or (self::button and (contains(@class, 'switch') or @data-state))",
  "slider": "self::input[@type='range'] or @role='slider'",
  "datepicker": "self::input and @type='date'",
  "colorpicker": "self::input and @type='color'",
  "radio": "(self::input and @type='radio') or @role='radio'",
  "dropdown": "(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])",
  "link": "self::a or @role='link' or @href",
  "navigation": "@role='navigation' or self::nav",
  "heading": "@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
  "list": "self::ul or self::ol or @role='list'",
  "listitem": "self::li or @role='listitem'",
  "menu": "self::menu or @role='menu'",
  "menuitem": "@role='menuitem'",
  "toolbar": "@role='toolbar'",
  "dialog": "@role='dialog'",
  "table": "self::table or @role='table'",
  "row": "self::tr or @role='row'",
  "column": "self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'",
  "cell": "self::td or @role='cell' or @role='gridcell'",
  "image": "self::img or @role='img' or @alt",
  "file": "self::input and @type='file'",
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

3. **Add unit test** in `tests/unit/types.test.js`:

   ```javascript
   it('should match native range inputs as slider', () => {
     const html = '<input type="range" min="0" max="100" />'
     const doc = new JSDOM(html).window.document
     const result = findElementsByType('slider', null, doc.body)
     expect(result.elements.length).toBe(1)
   })
   ```

4. **Add integration test** in `tests/integration/types/`:

   ```javascript
   it('should find slider in complex form', async () => {
     const result = await driver.executeScript(`
       return ElementFinder.findElementsByType('slider');
     `)
     expect(result.elements.length).toBeGreaterThan(0)
   })
   ```

5. **Rebuild and test**:
   ```bash
   npm run build && npm test
   ```

---

## 4. Attribute Matching Strategy

### 4.1 Search Priority

Attributes are searched in this order (from `searchable-attributes.json`):

```json
[
  "placeholder", // Form hints
  "value", // Current form values
  "data-test-id", // Test framework IDs
  "data-testid", // Popular test library ID
  "id", // Element ID
  "resource-id", // Mobile/framework specific
  "name", // HTML name attribute
  "aria-label", // Accessibility labels
  "hint", // Framework hints
  "title", // Tooltip titles
  "tooltip", // Explicit tooltips
  "alt", // Image alt text
  "src", // Source attributes
  "aria-labelledby" // References to label elements
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
   <!-- findElements(null, 'submit') matches via ID attribute -->
   ```

2. **Direct text** (immediate content)

   ```html
   <button>Submit</button>
   <!-- findElements(null, 'Submit') matches direct text -->
   ```

3. **Nested text** (fallback)
   ```html
   <button><span>Submit</span></button>
   <!-- findElements(null, 'Submit') matches nested text (less preferred) -->
   ```

### 4.3 Exact vs. Substring Matching

```javascript
// Substring matching (default)
findElements(null, 'Submit')
// Matches:
// - "Submit Button"
// - "Click to Submit"
// - "Submit Now"

// Exact matching
findElements(null, 'Submit', true)
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

## 5. The Four Search Functions

### 5.1 `findElementsByType(type, parent = null)`

**Purpose**: Find all elements matching a semantic type definition.

**Signature**:

```javascript
export function findElementsByType(type = 'element', parent = null)
  → { elements: [...], totalCount: number }
```

**Algorithm**:

```
1. Parse type name (validate it exists)
2. Get type matcher function from TYPE_MATCHERS
3. Traverse DOM with stack, checking each element
4. Collect all elements matching the type
5. Filter to innermost matches (remove parent containers)
6. Calculate bounding boxes
7. Return with metadata
```

**Example Usage**:

```javascript
// Find all buttons on the page
const result = ElementFinder.findElementsByType('button')
// {
//   elements: [
//     { element: <button>, boundingBox: {...}, frameIndex: -1, ... },
//     { element: <button>, boundingBox: {...}, frameIndex: -1, ... }
//   ]
// }

// Find all textboxes in a form
const form = document.getElementById('login-form')
const result = ElementFinder.findElementsByType('textbox', form)
// Returns only textboxes within the form
```

**Return Format**:

```javascript
{
  elements: [
    {
      element: Element,
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
      },
      frameIndex: -1,
      tagName: 'BUTTON',
    },
    // ... more elements
  ]
}
```

### 5.2 `findElementsByAttribute(value, exact = false, parent = null)`

**Purpose**: Find all elements matching searchable attributes or text content.

**Signature**:

```javascript
export function findElementsByAttribute(value, exact = false, parent = null)
  → { elements: [...], totalCount: number }
```

**Algorithm**:

```
1. Traverse DOM with stack
2. For each element, check if it matches attributes/text value
3. Collect all matching elements
4. Filter to innermost matches
5. Return with metadata
```

**Example Usage**:

```javascript
// Find elements with text containing "Submit"
const result = ElementFinder.findElementsByAttribute('Submit')
// Returns all elements (any type) containing "Submit"
// Matches: <button>Submit</button>, id="submit", placeholder="submit", etc.

// Exact match only
const result = ElementFinder.findElementsByAttribute('Submit', true)
// Returns only elements with exactly "Submit" (not "Submit Button")

// Search within a specific container
const dialog = document.querySelector('[role="dialog"]')
const result = ElementFinder.findElementsByAttribute('Close', false, dialog)
```

### 5.3 `findElements(type = null, text = null, exact = false, parent = null)` - Strict Combined

**Purpose**: Find elements matching BOTH a type AND attribute/text (no fallback).

**Signature**:

```javascript
export function findElements(type = null, text = null, exact = false, parent = null)
  → { elements: [...], totalCount: number }
```

**Algorithm**:

```
1. Traverse DOM with stack
2. For each element:
   - If type is specified: check matchesType(el, type)
   - If text is specified: check matchesAttribute(el, text, exact)
   - Both must match (AND logic)
3. Collect matching elements
4. Filter to innermost matches
5. Return with metadata
```

**Key Behavior**: Returns empty if no element matches BOTH conditions.

**Example Usage**:

```javascript
// Find a button with text "Submit" - strict match only
const result = ElementFinder.findElements('button', 'Submit')
// ONLY returns buttons that contain "Submit"
// Does NOT return labels with "Submit" even if nearby a button

// Find any type with text "Login"
const result = ElementFinder.findElements(null, 'Login')
// Returns any element containing "Login" (buttons, links, divs, etc.)

// Find a textbox (strict type match)
const result = ElementFinder.findElements('textbox')
// Returns all textboxes (input[type=text], textarea, [role=textbox])
// Returns empty if no textboxes exist
```

**Return Value**:

- Non-empty if direct match found
- Empty array if no element matches both conditions
- No fallback behavior

### 5.4 `findProbableElements(elementType, attributeText, exact = false, parent = null)` - Combined with Fallback

**Purpose**: Find elements matching both type and text, with intelligent fallback to nearby elements.

**Signature**:

```javascript
export function findProbableElements(elementType, attributeText, exact = false, parent = null)
  → { elements: [...], totalCount: number }
```

**Algorithm**:

```
PHASE 1: Direct Match
  For each element in DOM:
    if matchesType(element, elementType) AND matchesAttribute(element, attributeText):
      add to matches

PHASE 2: Fallback (only if Phase 1 finds nothing)
  For each element matching attributeText:
    nearby = findNearbyElementType(element, elementType)
    if nearby element exists:
      add to matches

PHASE 3: Post-process
  Filter matches to innermost (remove containers)
  Return with bounding boxes and metadata
```

**Why This Matters**:

Real-world UI patterns often separate content from interactive elements:

```html
<!-- Pattern 1: Label separate from input -->
<label>Email Address</label>
<input type="email" />
<!-- Without fallback: can't find textbox by "Email Address" text
     With fallback: findProbableElements('textbox', 'Email Address') → finds the input -->

<!-- Pattern 2: Button with icon, text in span -->
<button>
  <icon />
  <span>Save Changes</span>
</button>
<!-- Without fallback: might need exact element matching
     With fallback: findProbableElements('button', 'Save Changes') → finds button -->

<!-- Pattern 3: Menu items with nested content -->
<button class="menu-item">
  <span class="label">Delete</span>
  <span class="hotkey">Ctrl+D</span>
</button>
<!-- Without fallback: multiple matches depending on nested content
     With fallback: findProbableElements('button', 'Delete') → finds button -->
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
const result = ElementFinder.findProbableElements('button', 'Submit')
// Direct match: returns the button immediately

// Fallback case: text in parent or child
const container = document.createElement('div')
const label = document.createElement('span')
label.textContent = 'Username'
const input = document.createElement('input')
input.type = 'text'
container.appendChild(label)
container.appendChild(input)

const result = ElementFinder.findProbableElements('textbox', 'Username')
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

---

## 6. Element Counting Functions

### 6.1 `getElementCounts(type = null, parent = null)`

**Purpose**: Count elements by semantic type and visibility across the entire rendered page (all frames).

**Signature**:

```javascript
export function getElementCounts(type = null, parent = null)
  → Object.<string, { visible: number, hidden: number, total: number }>
```

**Parameters**:

| Parameter | Type      | Default | Description                                                              |
| --------- | --------- | ------- | ------------------------------------------------------------------------ |
| `type`    | `string`  | `null`  | Specific type to count. If `null`/`undefined`, counts all defined types. |
| `parent`  | `Element` | `null`  | Parent element to scope the count within.                                |

**Algorithm**:

```
1. Determine target types (single type or all defined types)
2. For each target type, call findElements(type) as source of truth
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
- Searches all frames (main document + iframes) by default
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)
- Throws `TypeError` if `type` is provided but not a string
- The generic `element` type is included when counting all types

**Example Usage**:

```javascript
// Count all defined types
const counts = ElementFinder.getElementCounts()
// { button: { visible: 3, hidden: 0, total: 3 }, ... }

// Count a single type
const buttons = ElementFinder.getElementCounts('button')
// { button: { visible: 3, hidden: 0, total: 3 } }

// Count within a specific parent
const formButtons = ElementFinder.getElementCounts(
  'button',
  document.querySelector('form'),
)
```

### 6.2 `getViewportElementCounts(type = null, parent = null)`

**Purpose**: Count elements by semantic type that are currently visible within the browser viewport. Unlike `getElementCounts`, this excludes elements outside the viewport entirely.

**Signature**:

```javascript
export function getViewportElementCounts(type = null, parent = null)
  → Object.<string, { visible: number, hidden: number, total: number }>
```

**Parameters**:

| Parameter | Type      | Default | Description                                                              |
| --------- | --------- | ------- | ------------------------------------------------------------------------ |
| `type`    | `string`  | `null`  | Specific type to count. If `null`/`undefined`, counts all defined types. |
| `parent`  | `Element` | `null`  | Parent element to scope the count within.                                |

**Algorithm**:

```
1. Determine target types (single type or all defined types)
2. For each target type, call findElements(type) as source of truth
3. For each returned element, check inViewport() — skip if outside viewport
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
- Filters by `inViewport()` — only elements whose bounding box intersects the visual viewport are counted
- Elements outside the viewport are excluded entirely (not counted in any bucket)
- The `total` count represents all viewport elements (`visible + hidden`), not all page elements
- Searches all frames (main document + iframes) by default
- Returns `{ [type]: { visible: 0, hidden: 0, total: 0 } }` for unknown types (with console warning)
- Throws `TypeError` if `type` is provided but not a string

**Example Usage**:

```javascript
// Count all defined types currently in viewport
const counts = ElementFinder.getViewportElementCounts()
// { button: { visible: 2, hidden: 0, total: 2 }, ... }

// Count one type in the viewport
const buttons = ElementFinder.getViewportElementCounts('button')
// { button: { visible: 2, hidden: 0, total: 2 } }

// Count within a parent element (viewport-scoped)
const inputs = ElementFinder.getViewportElementCounts(
  'textbox',
  document.querySelector('form'),
)
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

## 7. Return Format & Metadata

### 7.1 Return Structure

All find functions return a standardized object:

```javascript
{
  elements: [
    {
      element: Element | undefined,
      boundingBox: {
        x: number,           // Left edge relative to viewport
        y: number,           // Top edge relative to viewport
        width: number,       // Element width
        height: number,      // Element height
        top: number,         // Top edge (same as y)
        bottom: number,      // Bottom edge (y + height)
        left: number,        // Left edge (same as x)
        right: number,       // Right edge (x + width)
        midx: number,        // Center X coordinate
        midy: number         // Center Y coordinate
      },
      frameIndex: number,    // -1 for main frame, 0+ for iframes
      tagName: string        // Uppercase tag name (e.g., 'BUTTON')
    },
    // ... more elements
  ],
  totalCount: number        // Total matches found
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
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    midx: rect.left + rect.width / 2,
    midy: rect.top + rect.height / 2,
    tagName: element.tagName,
  }
}
```

**Properties Explained**:

- `x`, `y`: Viewport-relative position
- `width`, `height`: Rendered dimensions
- `top`, `bottom`, `left`, `right`: Aliases for clarity
- `midx`, `midy`: Center coordinates (useful for clicking)
- `tagName`: HTML tag name
- `isHidden`: `true` if element is hidden (display:none, visibility:hidden, hidden attribute, aria-hidden, inert, or zero dimensions). Note: Zero opacity is NOT considered hidden.
- `inViewport`: `true` if any portion of the element intersects the visual viewport (computed via `getBoundingClientRect()`). Always `false` when `isHidden` is `true` or the element has zero rendered dimensions.

**Usage Example**:

```javascript
const result = ElementFinder.findElements('button', 'Submit')
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

The `isHidden` flag is determined by checking:

1. `offsetWidth === 0 && offsetHeight === 0` - Element has no rendered dimensions
2. CSS `visibility: hidden` or `visibility: collapse`
3. CSS `display: none`
4. Presence of `hidden` attribute or `aria-hidden="true"`
5. Element `inert` property

**Note**: Zero opacity is NOT considered hidden. Sites use opacity transitions for lazy-loaded sections that fade in on scroll, and these elements are still laid out and interactable.

**Usage Example**:

```javascript
const result = ElementFinder.findElements('button', null)
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
const result = ElementFinder.findElements('button', null)
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
  if (type !== null && typeof type !== 'string') {
    throw new TypeError(
      `type must be null or a string, got ${typeof type} (${String(type).slice(0, 50)})`,
    )
  }

  // Warn for unknown types but don't error
  if (type !== null && !ELEMENT_DEFINITIONS[type]) {
    console.warn(
      `Unknown element type: "${type}". Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`,
    )
    return { elements: [], totalCount: 0 }
  }

  // Validate text parameter
  if (text !== null && typeof text !== 'string') {
    throw new TypeError(`text must be null or a string, got ${typeof text}`)
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
// Empty strings treated as "no filter"
if (text === '') text = null

// null/undefined normalized
parent = parent || window.document.documentElement

// Type defaults
if (type === null && text === null) {
  // Find all elements
  type = 'element'
}
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

### 9.1 Testing Pyramid

```
                 ▲
              INTEGRATION
            (Real Browser)
           Selenium WebDriver
           Full DOM scenarios
                 │
          ◆ ◆ ◆ UNIT TESTS ◆ ◆ ◆
         (Fast - JSDOM)
         Controlled scenarios
         Edge case coverage
```

**Cost/Benefit**:

- **Unit tests** (90%): Fast, isolated, comprehensive edge cases
- **Integration tests** (10%): Slow, real browser, confirms real-world scenarios

### 9.2 Unit Tests (tests/unit/)

**File Organization**:

```
tests/unit/
├── find-elements.test.js     # Combined search function tests
├── attributes.test.js        # Attribute matching tests
└── types.test.js             # Type definition tests
```

**Scope**: Individual function behavior, edge cases, error handling

**Test Environment**: JSDOM (simulated DOM in Node.js)

**Example**:

```javascript
// tests/unit/find-elements.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { findElements } from '../../src/element-finder.js'

describe('findElements - Combined search', () => {
  let doc

  beforeEach(() => {
    const html = `
      <button id="btn1">Submit</button>
      <div role="button">Save</div>
      <input type="text" placeholder="Search" />
    `
    doc = new JSDOM(html).window.document
  })

  it('should find elements matching both type and text', () => {
    const result = findElements('button', 'Submit', false, doc.body)
    expect(result.elements.length).toBe(1)
    expect(result.elements[0].element?.id).toBe('btn1')
  })

  it('should return empty when no element matches both type and text', () => {
    const result = findElements('button', 'NonExistent', false, doc.body)
    expect(result.elements.length).toBe(0)
  })

  it('should support exact matching', () => {
    const result = findElements('button', 'Submit', true, doc.body)
    expect(result.elements.length).toBe(1)
  })

  it('should handle null parameters (find all)', () => {
    const result = findElements(null, null, false, doc.body)
    expect(result.elements.length).toBeGreaterThan(0)
  })
})
```

**Running Unit Tests**:

```bash
npm test                    # All tests
npm test -- find-elements   # Specific file
npm test -- --run          # Run once, don't watch
```

### 9.3 Integration Tests (tests/integration/)

**File Organization**:

```
tests/integration/
├── helpers/
│   └── driver-helper.js        # Selenium setup
├── types/
│   ├── element-types.test.js   # Type matching tests
│   ├── find-elements.test.js   # Combined search tests
│   ├── find-probable-elements.test.js  # Fallback tests
│   └── ...
├── attributes/
│   ├── dropdowns.test.js
│   ├── forms.test.js
│   └── ...
└── fixtures/
    ├── element-types.html      # Test HTML
    ├── forms.html
    └── ...
```

**Test Environment**: Real Chrome browser via Selenium WebDriver

**Example**:

```javascript
// tests/integration/types/find-probable-elements.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDriver, loadLibrary } from '../helpers/driver-helper.js'

describe('findProbableElements - Fallback behavior', () => {
  let driver

  beforeAll(async () => {
    driver = await createDriver()
    await driver.get(`file://${__dirname}/../fixtures/element-types.html`)
    await loadLibrary(driver)
  })

  afterAll(async () => {
    await driver.quit()
  })

  it('should find button when text is in nearby span', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findProbableElements('button', 'Click Me');
    `)
    expect(result.elements.length).toBe(1)
    expect(result.elements[0].tagName).toBe('BUTTON')
  })

  it('should find textbox when label text matches', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findProbableElements('textbox', 'Email');
    `)
    expect(result.elements.length).toBe(1)
    expect(result.elements[0].tagName).toBe('INPUT')
  })

  it('should still find direct matches first', async () => {
    const result = await driver.executeScript(`
      return ElementFinder.findProbableElements('button', 'Direct Match Button');
    `)
    // Button with text directly in it should be found
    expect(result.elements.length).toBe(1)
  })
})
```

**Running Integration Tests**:

```bash
npm test -- tests/integration/     # All integration tests
npm test -- find-probable-elements # Specific suite
npm run test:integration           # Integration tests only
```

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

// BAD: Parsing on every call
function findElementsByType(type) {
  const expr = elementDefinitionsData[type]
  // Parse expression on EVERY search - expensive!
}
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
const result = findElements('textbox', null, false, form)
// Only searches within form, not entire document

// BAD: Search entire document every time
const result = findElements('textbox', null, false, document.body)
// Searches entire page even if you only need form fields
```

**Impact**: Proportional to DOM size (10-100x faster for large pages)

### 10.6 Performance Benchmarks

Typical performance on modern hardware:

```
Operation                    Time
────────────────────────────────────
findElementsByType('button')   2-5ms      (10 buttons on page)
findElements('button', 'OK')  3-8ms      (direct match)
findProbableElements(...)     8-15ms     (includes fallback search)
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

### 10.1 Build Process

The library is built into two formats:

```bash
npm run build
# Creates:
# - index.js      (ESM + CommonJS compatible, unminified)
# - index.min.js  (Minified version)
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

### 10.2 Module Exports

Main entry point exports:

```javascript
// Main functions
export { findElementsByType }
export { findElementsByAttribute }
export { findElements }
export { findProbableElements }

// Utilities
export { getAllElements }
export { getAllFrames }
export { getBoundingBox }
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

// Inspection
export { getValidTypes }
export { getValidAttributes }

// Debugging
export { highlight }
export { unhighlight }
```

### 10.3 Browser Distribution

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

### 10.4 Version Management

**Current Version**: 1.1.1

**Versioning Strategy**: Semantic versioning

- MAJOR: Breaking API changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**Recent Changes**:

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
    environment: 'jsdom', // Use JSDOM for unit tests
    globals: true, // Global test functions
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
findElements(null, 'Submit') // Matches "Submit" and "Re-Submit"
findElements(null, 'SUBMIT') // Does NOT match "Submit"

// Workaround: Convert text before searching
const lower = 'submit'.toLowerCase()
// Or: Don't use text-based identification (use type instead)
```

**Whitespace Handling**:

```javascript
// Whitespace is NOT normalized
const el = document.createElement('button')
el.textContent = '  Submit  '

findElements(null, 'Submit') // Does NOT match (spaces differ)
findElements(null, '  Submit  ') // Matches exactly
findElements(null, 'ubmit') // Matches (substring match)

// Workaround: Use exact: false and include whitespace
findElements(null, ' Submit ', false)
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

findElements('button', 'Click') // Matches (contains "Click")
findElements('button', 'Me') // Matches (contains "Me")
findElements('button', 'ClickMe') // Matches (concatenated text)
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
const result = findElements(null, null) // Loads all elements into array
// Uses ~10-50MB memory (depends on element data)

// Optimize: Search within container
const container = document.getElementById('app')
const result = findElements(null, null, false, container)
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
  const result = ElementFinder.findElements('button', text)
  if (result.elements.length === 0) {
    throw new Error(`Button with text "${text}" not found`)
  }

  const button = result.elements[0].element
  button.click()

  // Or in Selenium
  await driver.executeScript(`
    const result = ElementFinder.findElements('button', '${text}');
    result.elements[0].element.click();
  `)
}

// Usage
await clickButton('Submit')
```

### 13.2 Fill Form Input

```javascript
async function fillInput(label, value) {
  const result = ElementFinder.findProbableElements('textbox', label)
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
  const result = ElementFinder.findElements(type, text)
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
  const result = ElementFinder.findElements(type, text)
  return result.elements.length
}

// Usage
const buttonCount = countElements('button') // All buttons
const submitCount = countElements('button', 'Submit') // Submit buttons
```

### 13.5 Get Element Position

```javascript
function getElementCenter(type, text) {
  const result = ElementFinder.findElements(type, text)
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

  const result = ElementFinder.findElements(type, text, false, dialog)
  return result.elements
}

// Usage
const buttons = await findInDialog('button', 'OK')
```

### 13.7 Highlight Found Elements (for debugging)

```javascript
function highlightElements(type, text) {
  const result = ElementFinder.findElements(type, text)
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
    const result = ElementFinder.findElementsByType(type)
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

**Step 2**: Create unit test

```javascript
// tests/unit/types.test.js
it('should match breadcrumb navigation', () => {
  const html = '<nav aria-label="breadcrumb"><a href="/">Home</a></nav>'
  const doc = new JSDOM(html).window.document
  const result = findElementsByType('breadcrumb', null, doc.body)
  expect(result.elements.length).toBe(1)
})
```

**Step 3**: Run unit tests

```bash
npm test -- tests/unit/types.test.js
```

**Step 4**: Create integration test

```javascript
// tests/integration/types/breadcrumb.test.js
it('should find breadcrumb in page', async () => {
  const result = await driver.executeScript(`
    return ElementFinder.findElementsByType('breadcrumb');
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
  const result = findElements(null, 'SUBMIT')
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
// Unit test to isolate problem
const html = '<button id="test">Click</button>'
const doc = new JSDOM(html).window.document
const button = doc.getElementById('test')

// Test each function in isolation
console.log('matchesType:', ElementFinder.matchesType(button, 'button'))
console.log(
  'matchesAttribute:',
  ElementFinder.matchesAttribute(button, 'Click'),
)
console.log('parseXPath:', ElementFinder.parseXPath('self::button', button))
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
  ElementFinder.findElements('button', 'Submit')
}, 100)

console.log(`Average search time: ${avgTime.toFixed(2)}ms`)
```

**Profile with DevTools**:

```javascript
// In browser console
performance.mark('search-start')
ElementFinder.findElements('button', 'Submit')
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
   const result = ElementFinder.findElements('button', 'Submit')
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
   ElementFinder.findElements('button', 'Submit')
   ElementFinder.findElements('button', 'submit') // Case sensitive!
   ElementFinder.findElements('button', 'Submit ') // Whitespace matters!
   ElementFinder.findElements('button', 'Sub') // Substring match
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
const strict = ElementFinder.findElements('button', 'Click')
const probable = ElementFinder.findProbableElements('button', 'Click')

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
   ElementFinder.findElements('button', 'Submit') // Searches entire page

   // Do:
   const form = document.getElementById('form')
   ElementFinder.findElements('button', 'Submit', false, form) // Searches form only
   ```

2. **Use type-only search if possible**:

   ```javascript
   // Instead of:
   ElementFinder.findElements('button', 'Submit')

   // If you know the text, maybe:
   ElementFinder.findElementsByType('button') // If text not needed
   ```

3. **Cache results**:

   ```javascript
   const buttonCache = new Map()

   function getCachedButton(text) {
     if (!buttonCache.has(text)) {
       buttonCache.set(text, ElementFinder.findElements('button', text))
     }
     return buttonCache.get(text)
   }
   ```

4. **Profile to find bottleneck**:
   ```javascript
   console.time('search')
   const result = ElementFinder.findElements('button', 'Submit')
   console.timeEnd('search') // Tells you how long search took
   ```

### 15.5 Cross-Origin Iframe Issues

**Issue**: Cannot find elements in cross-origin iframe

```javascript
const result = ElementFinder.findElements('button')
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
  return ElementFinder.findElements('button', 'Submit');
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
  return ElementFinder.findElementsByType('element');
  // Then filter for custom-element tags
`)
```

### 15.7 Memory Leaks

**Issue**: Search results causing memory buildup

```javascript
// Problem: Storing many results without cleanup
const allResults = []
for (let i = 0; i < 1000; i++) {
  allResults.push(ElementFinder.findElements('button'))
}
// Holds references to 1000 large result objects

// Solution: Clear results when done
allResults.length = 0
// Or use scoped results
{
  const result = ElementFinder.findElements('button')
  // Use result
}
// result is garbage collected when scope ends
```

---

## Appendix A: API Reference

### Quick Reference

| Function                                          | Purpose                                 | Example                                                          |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `findElementsByType(type, parent)`                | Find by semantic type                   | `findElementsByType('button')`                                   |
| `findElementsByAttribute(value, exact, parent)`   | Find by text/attributes                 | `findElementsByAttribute('Submit')`                              |
| `findElements(type, text, exact, parent)`         | Strict combined search                  | `findElements('button', 'Submit')`                               |
| `findProbableElements(type, text, exact, parent)` | Flexible combined search                | `findProbableElements('button', 'Click')`                        |
| `matchesType(el, type)`                           | Check if element matches type           | `matchesType(button, 'button')` → true                           |
| `matchesAttribute(el, value, exact)`              | Check if element matches attribute/text | `matchesAttribute(button, 'OK')` → true                          |
| `getBoundingBox(element)`                         | Get element position and size           | `getBoundingBox(button)` → { x: 10, y: 20, ... }                 |
| `getAllElements(root)`                            | Get all elements (flat list)            | `getAllElements(document.body)` → [...]                          |
| `getAllFrames(root)`                              | Get all frames recursively              | `getAllFrames()` → [{ window, document, frameIndex }, ...]       |
| `parseXPath(expr, el)`                            | Parse XPath-like expression             | `parseXPath('self::button', el)` → true                          |
| `highlight(elements)`                             | Highlight elements red                  | `highlight([button1, button2])`                                  |
| `unhighlight(elements)`                           | Remove highlight                        | `unhighlight([button1, button2])`                                |
| `getValidTypes()`                                 | List all element types                  | `getValidTypes()` → ['button', 'textbox', ...]                   |
| `getValidAttributes()`                            | List all valid searchable attributes    | `getValidAttributes()` → ['placeholder', 'value', ...]           |
| `getSearchableAttributes()`                       | List attribute search order             | `getSearchableAttributes()` → ['data-testid', ...]               |
| `setSearchableAttributes(array)`                  | Set attribute search order              | `setSearchableAttributes(['data-qa', ...])`                      |
| `getSearchableAttributeValues(element)`           | Inspect non-empty searchable attributes | `getSearchableAttributeValues(input)` → { id: 'email' }          |
| `getElementCounts(type, parent)`                  | Count elements by type and visibility   | `getElementCounts('button')` → `{ button: { visible: 3, ... } }` |
| `getViewportElementCounts(type, parent)`          | Count viewport-visible elements by type | `getViewportElementCounts()` → `{ button: { visible: 2, ... } }` |
| `inViewport(el, options)`                         | Check if element is in viewport (sync)  | `inViewport(el)` → true/false                                    |
| `isHidden(el)`                                    | Check if element is hidden              | `isHidden(el)` → true/false                                      |

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

| Date      | Version | Changes                                    |
| --------- | ------- | ------------------------------------------ |
| June 2026 | 1.1.7   | Added `getValidAttributes()` documentation |
| May 2026  | 1.1.1   | Added `findProbableElements` documentation |
| May 2026  | 1.1.0   | Initial engineering documentation          |

---

**For questions or clarifications about this document, refer to the actual source code in `src/element-finder.js` or create an issue on GitHub.**
