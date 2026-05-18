/**
 * Browser Element Finder
 * 
 * A standalone JavaScript library that can be run in the browser to identify
 * elements by type and/or text content, returning matching elements with their
 * bounding boxes.
 * 
 * Usage in browser console:
 *   // Find all buttons
 *   const results = ElementFinder.findElement('button');
 *   
 *   // Find buttons with specific text
 *   const results = ElementFinder.findElement('button', 'Submit');
 *   
 *   // Find elements by text only
 *   const results = ElementFinder.findElement(null, 'seleniumbase');
 *   
 *   // Find links with specific text
 *   const results = ElementFinder.findElement('link', 'seleniumbase');
 *   
 *   // Find elements within a parent element
 *   const parent = document.querySelector('.container');
 *   const results = ElementFinder.findElement('button', null, false, false, parent);
 */

const ElementFinder = (function() {
// XPath-like expression parser for element type definitions
function parseXPath(expr, el) {
  expr = expr.trim();
  if (expr === 'true()') return true;
  
  // Handle outermost matching parentheses
  if (expr.startsWith('(') && expr.endsWith(')')) {
    // Ensure the parentheses are actually matching pairs balancing the expression
    let depth = 0;
    let matchedAll = true;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      if (depth === 0 && i < expr.length - 1) {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) {
      return parseXPath(expr.slice(1, -1), el);
    }
  }
  
  // Split by ' or ' for OR conditions (outermost first)
  const orParts = splitByOperator(expr, 'or');
  if (orParts.length > 1) {
    for (const part of orParts) {
      if (parseXPath(part, el)) return true;
    }
    return false;
  }
  
  // Split by ' and ' for AND conditions
  const andParts = splitByOperator(expr, 'and');
  if (andParts.length > 1) {
    for (const part of andParts) {
      if (!parseXPath(part, el)) return false;
    }
    return true;
  }
  
  return parseCondition(expr, el);
}

function splitByOperator(expr, op) {
  const parts = [];
  let depth = 0;
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    
    // Manage skipping structural operators inside string literals
    if ((char === "'" || char === '"') && (i === 0 || expr[i-1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
    }

    if (!inQuotes) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      
      // Check for operator at boundary
      const remaining = expr.slice(i);
      const opPattern = new RegExp(`^\\s*\\b${op}\\b\\s*`, 'i');
      if (depth === 0 && opPattern.test(remaining)) {
        parts.push(current.trim());
        i += remaining.match(opPattern)[0].length - 1;
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseCondition(expr, el) {
  expr = expr.trim();

  // Handle self::tag[@attr='value'] or self::tag
  const selfWithTagMatch = expr.match(/^self::([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/);
  if (selfWithTagMatch) {
    const tagName = selfWithTagMatch[1].toUpperCase();
    if (el.tagName !== tagName) return false;
    if (selfWithTagMatch[2]) {
      return parseXPath(selfWithTagMatch[2], el);
    }
    return true;
  }
  
  // Handle contains(@attr, 'value') - Now accepts dynamic spaces inside quotes safely
  const containsMatch = expr.match(/contains\(@([a-zA-Z0-9-]+),\s*['"]([^'"]+)['"]\)/i);
  if (containsMatch) {
    const attr = el.getAttribute(containsMatch[1]) || '';
    return attr.toLowerCase().includes(containsMatch[2].toLowerCase());
  }
  
  // Handle @attr='value'
  const attrMatch = expr.match(/@([a-zA-Z0-9-]+)\s*=\s*['"]([^'"]+)['"]/);
  if (attrMatch) {
    return el.getAttribute(attrMatch[1]) === attrMatch[2];
  }
  
  // Handle @attr (attribute exists check)
  const attrExists = expr.match(/^@([a-zA-Z0-9-]+)$/);
  if (attrExists) {
    return el.hasAttribute(attrExists[1]);
  }
  
  // Handle descendant::tag
  const descendantMatch = expr.match(/descendant::([a-zA-Z0-9-]+)/i);
  if (descendantMatch) {
    return el.querySelector(descendantMatch[1]) !== null;
  }
  
  // Handle ancestor::*[condition]
  const ancestorMatch = expr.match(/ancestor::\*\[([^\]]+)\]/i);
  if (ancestorMatch) {
    let parent = el.parentElement;
    while (parent) {
      if (parseXPath(ancestorMatch[1], parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }
  
  return false;
}

// Element type definitions as XPath-like strings
const ELEMENT_DEFINITIONS = {
  "link": "self::a or @role='link' or @href",
  "navigation": "@role='navigation' or self::nav",
  "heading": "@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
  "button": "self::button or @role='button' or @type='button' or @type='submit'",
  "checkbox": "(self::input and @type='checkbox') or @role='checkbox'",
  "switch": "self::button[@role='switch'] or (self::input and @type='checkbox') or @role='switch' or (self::button and @data-state)",
  "slider": "self::input[@type='range'] or @role='slider'",
  "radio": "(self::input and @type='radio') or @role='radio'",
  "dropdown": "(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])",
  "textbox": "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email')) or @role='textbox'",
  "file": "self::input and @type='file'",
  "list": "self::ul or self::ol or @role='list'",
  "listitem": "self::li or @role='listitem'",
  "menu": "self::menu or @role='menu'",
  "menuitem": "@role='menuitem'",
  "toolbar": "@role='toolbar'",
  "dialog": "@role='dialog'",
  "table": "self::table or @role='table'",
  "row": "self::tr or @role='row'",
  "column": "self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'",
  "image": "self::img or @role='img' or @alt",
  "element": "true()"
}
;

// Searchable attributes (in priority order)
let SEARCHABLE_ATTRIBUTES = [
  "placeholder",
  "value",
  "data-test-id",
  "data-testid",
  "id",
  "resource-id",
  "name",
  "aria-label",
  "class",
  "hint",
  "title",
  "tooltip",
  "alt",
  "src",
  "aria-labelledby"
]
;

function setSearchableAttributes(attributes) {
  if (Array.isArray(attributes)) {
    SEARCHABLE_ATTRIBUTES = attributes;
  }
}

function getSearchableAttributes() {
  return [...SEARCHABLE_ATTRIBUTES];
}

function matchesType(el, type) {
  const expr = ELEMENT_DEFINITIONS[type];
  return expr ? parseXPath(expr, el) : false;
}

function matchesContent(el, value, exact = false) {
  if (value === undefined || value === null || value === '') return true;
  const normalizedValue = value.toLowerCase().trim();

  // Check prioritized attributes
  for (const attr of SEARCHABLE_ATTRIBUTES) {
    const attrValue = el.getAttribute(attr);
    if (attrValue) {
      const normalized = attrValue.toLowerCase().trim();
      if (exact ? normalized === normalizedValue : normalized.includes(normalizedValue)) {
        return true;
      }
    }
  }

  // FIXED: Collect only direct explicit text nodes belonging to this element
  const directText = Array.from(el.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .toLowerCase()
    .trim();

  if (exact ? directText === normalizedValue : directText.includes(normalizedValue)) {
    return true;
  }

  return false;
}

function getBoundingBox(el) {
  const rect = el.getBoundingClientRect();
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
    tagName: el.tagName.toLowerCase()
  };
}

// FIXED: Handles Shadow DOM and cross-origin boundaries without double-loop repetition
function getAllElements(root = document) {
  const elements = [];
  const rootNode = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
  if (!rootNode) return elements;

  const walker = (rootNode.ownerDocument || rootNode).createTreeWalker(
    rootNode,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        // Skip script and style tags
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    elements.push(node);

    // Traverse Shadow DOM securely
    if (node.shadowRoot) {
      elements.push(...getAllElements(node.shadowRoot));
    }
  }
  return elements;
}

function findElement(type, text, exact = false, includeHidden = false, parent = null) {
  // Validate type if provided
  if (type && !ELEMENT_DEFINITIONS[type]) {
    console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`);
    return { elements: [] };
  }

  const allElements = getAllElements(parent || document);
  const matches = [];

  for (const el of allElements) {
    
    // Check type match if specified
    if (type && !matchesType(el, type)) continue;

    // Check text/attribute match if specified
    if (text !== undefined && !matchesContent(el, text, exact)) continue;

    // Check visibility
    if (!includeHidden) {
      const elWindow = el.ownerDocument?.defaultView || window;
      const style = elWindow.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' ||
          style.opacity === '0' || el.offsetWidth === 0 || el.offsetHeight === 0) {
        continue;
      }
    }

    matches.push(el);
  }

  // Filter to keep only innermost elements (remove ancestors that have matching descendants)
  const innermostMatches = matches.filter(el => {
    return !matches.some(other => {
      // If other is a descendant of el and both match, keep the innermost (other)
      return other !== el && el.contains(other);
    });
  });

  // Build results with bounding boxes and tag names
  const qualified = innermostMatches.map(el => {
    return {
      element: el,
      boundingBox: getBoundingBox(el),
      tagName: el.tagName.toLowerCase()
    };
  });

  return { elements: qualified };
}

// FIXED: Gracefully accepts raw objects, raw nodes, or API results wrapper payloads
function highlight(elements, color = 'red', width = 3) {
  let items;
  if (elements && elements.elements && Array.isArray(elements.elements)) {
    items = elements.elements;
  } else {
    items = Array.isArray(elements) ? elements : [elements];
  }

  items.forEach(item => {
    const el = item.element ? item.element : item;
    if (el && el.style) {
      el.style.outline = `${width}px solid ${color}`;
      el.style.outlineOffset = '2px';
      el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
      el.classList.add('elementfinder-highlighted');
    }
  });
}

function unhighlight(elements) {
  let items;
  if (elements && elements.elements && Array.isArray(elements.elements)) {
    items = elements.elements;
  } else {
    items = Array.isArray(elements) ? elements : [elements];
  }

  items.forEach(item => {
    const el = item.element ? item.element : item;
    if (el && el.style) {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
      el.classList.remove('elementfinder-highlighted');
    }
  });
}

function getValidTypes() {
  return Object.keys(ELEMENT_DEFINITIONS);
}

  // Public API
  return {
    findElement,
    highlight,
    unhighlight,
    getValidTypes,
    getBoundingBox,
    setSearchableAttributes,
    getSearchableAttributes,
    parseXPath,
    splitByOperator,
    parseCondition,
    matchesType,
    matchesContent,
    getAllElements,
    ELEMENT_DEFINITIONS,
    SEARCHABLE_ATTRIBUTES
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementFinder;
}
