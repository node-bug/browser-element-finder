/**
 * Element Finder - Combined Module
 *
 * This module provides functionality to find elements by type and/or searchable attributes.
 * Combined implementation supporting both findElementByType and findElementByAttributes.
 */

import elementDefinitionsData from './element-definitions.json' with { type: 'json' };
import searchableAttributesData from './searchable-attributes.json' with { type: 'json' };

// Precompiled regex patterns for performance (avoid recompiling on every call)
const REGEX_PATTERNS = {
  selfWithTag: /^self::([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/,
  contains: /contains\(@([a-zA-Z0-9-]+),\s*['"]([^'"]+)['"]\)/i,
  attrEquals: /@([a-zA-Z0-9-]+)\s*=\s*['"]([^'"]*)['"]/,
  attrExists: /^@([a-zA-Z0-9-]+)$/,
  descendant: /descendant::([a-zA-Z0-9-]+)/i,
  ancestor: /ancestor::\*\[([^\]]+)\]/i,
  operatorOr: /^\s*\bor\b\s*/i,
  operatorAnd: /^\s*\band\b\s*/i
};

// Maximum recursion depth for XPath parsing to prevent stack overflow
const MAX_RECURSION_DEPTH = 100;

// Pre-compiled type matcher functions for faster type checking
const TYPE_MATCHERS = new Map();

// Compile all type definitions into matcher functions on module load
for (const [type, expr] of Object.entries(elementDefinitionsData)) {
  if (expr === 'true()') {
    TYPE_MATCHERS.set(type, () => true);
  } else {
    TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el));
  }
}

/**
 * Searchable attributes (in priority order) - internal state
 */
let SEARCHABLE_ATTRIBUTES = searchableAttributesData;

/**
 * Sets custom searchable attributes for attribute matching.
 * @param {string[]} attributes - Array of attribute names to search (in priority order)
 * @throws {TypeError} If attributes is not an array
 */
export function setSearchableAttributes(attributes) {
  if (!Array.isArray(attributes)) {
    throw new TypeError('attributes must be an array');
  }
  SEARCHABLE_ATTRIBUTES = attributes;
}

/**
 * Gets the current searchable attributes array.
 * @returns {string[]} Copy of the current searchable attributes array
 */
export function getSearchableAttributes() {
  return [...SEARCHABLE_ATTRIBUTES];
}

/**
 * Parses an XPath-like expression for element type matching.
 * Supports conditions like self::tag, @attr='value', contains(), descendant::, ancestor::*
 * @param {string} expr - The XPath-like expression to parse
 * @param {Element} el - The DOM element to test against
 * @param {number} [depth=0] - Current recursion depth (internal use)
 * @returns {boolean} True if the element matches the expression
 */
export function parseXPath(expr, el, depth = 0) {
  if (expr == null || el == null) return false;

  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error('XPath expression exceeds maximum recursion depth');
  }

  expr = expr.trim();
  if (expr === 'true()') return true;

  // Handle outermost matching parentheses
  if (expr[0] === '(' && expr[expr.length - 1] === ')') {
    let parenDepth = 1;
    let matchedAll = true;
    for (let i = 1; i < expr.length - 1; i++) {
      if (expr[i] === '(') parenDepth++;
      else if (expr[i] === ')') parenDepth--;
      if (parenDepth === 0) { matchedAll = false; break; }
    }
    if (matchedAll) return parseXPath(expr.slice(1, -1), el, depth + 1);
  }

  // Split by ' or ' for OR conditions
  const orParts = splitByOperator(expr, 'or');
  if (orParts.length > 1) {
    for (const part of orParts) {
      if (parseXPath(part, el, depth + 1)) return true;
    }
    return false;
  }

  // Split by ' and ' for AND conditions
  const andParts = splitByOperator(expr, 'and');
  if (andParts.length > 1) {
    for (const part of andParts) {
      if (!parseXPath(part, el, depth + 1)) return false;
    }
    return true;
  }

  return parseCondition(expr, el, depth);
}

/**
 * Splits an XPath expression by the specified operator (and/or).
 * Handles nested parentheses and quoted strings correctly.
 * @param {string} expr - The XPath expression to split
 * @param {string} op - The operator to split by ('and' or 'or')
 * @returns {string[]} Array of expression parts
 */
export function splitByOperator(expr, op) {
  const parts = [];
  let depth = 0;
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  const opPattern = op === 'or' ? REGEX_PATTERNS.operatorOr : REGEX_PATTERNS.operatorAnd;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

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

      if (depth === 0) {
        const remaining = expr.slice(i);
        const match = remaining.match(opPattern);
        if (match) {
          parts.push(current.trim());
          i += match[0].length - 1;
          current = '';
          continue;
        }
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Parses a single condition within an XPath expression.
 * Handles self::tag, @attr='value', @attr, contains(), descendant::, ancestor::*
 * @param {string} expr - The condition expression to parse
 * @param {Element} el - The DOM element to test against
 * @param {number} [depth=0] - Current recursion depth (internal use)
 * @returns {boolean} True if the element matches the condition
 */
export function parseCondition(expr, el, depth = 0) {
  if (expr == null || el == null) return false;

  expr = expr.trim();

  const selfMatch = expr.match(REGEX_PATTERNS.selfWithTag);
  if (selfMatch) {
    const tagName = selfMatch[1].toUpperCase();
    if (el.tagName !== tagName) return false;
    return selfMatch[2] ? parseXPath(selfMatch[2], el, depth + 1) : true;
  }

  const containsMatch = expr.match(REGEX_PATTERNS.contains);
  if (containsMatch) {
    const attr = el.getAttribute(containsMatch[1]) || '';
    return attr.toLowerCase().includes(containsMatch[2].toLowerCase());
  }

  const attrEqualsMatch = expr.match(REGEX_PATTERNS.attrEquals);
  if (attrEqualsMatch) {
    return el.getAttribute(attrEqualsMatch[1]) === attrEqualsMatch[2];
  }

  const attrExistsMatch = expr.match(REGEX_PATTERNS.attrExists);
  if (attrExistsMatch) {
    return el.hasAttribute(attrExistsMatch[1]);
  }

  const descendantMatch = expr.match(REGEX_PATTERNS.descendant);
  if (descendantMatch) {
    return el.querySelector(descendantMatch[1]) !== null;
  }

  const ancestorMatch = expr.match(REGEX_PATTERNS.ancestor);
  if (ancestorMatch) {
    let parent = el.parentElement;
    while (parent) {
      if (parseXPath(ancestorMatch[1], parent, depth + 1)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  return false;
}

/**
 * Element type definitions as XPath-like strings.
 * Keys are type names, values are XPath expressions.
 * @type {Object.<string, string>}
 */
export const ELEMENT_DEFINITIONS = Object.freeze(elementDefinitionsData);

/**
 * Gets direct text content from an element's text nodes.
 * More efficient than textContent for simple text matching.
 * @param {Element} el - The DOM element
 * @returns {string} Concatenated text from direct text nodes
 */
function getDirectText(el) {
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

/**
 * Checks if an element is inside a STYLE or SCRIPT tag, or contains STYLE/SCRIPT descendants.
 * @param {Element} el - The DOM element to check
 * @returns {boolean} True if the element is inside a STYLE or SCRIPT tag, or contains one
 */
function isInsideStyleOrScript(el) {
  // Check if element itself is a STYLE or SCRIPT tag
  if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') {
    return true;
  }

  // Check if element contains STYLE or SCRIPT descendants
  if (el.querySelector('STYLE, SCRIPT')) {
    return true;
  }

  // Check if element is inside a STYLE or SCRIPT tag
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName === 'STYLE' || parent.tagName === 'SCRIPT') {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Checks if an element matches the specified attribute value.
 * Searches through all searchable attributes in priority order, then text content.
 * Text matching is case-sensitive. Ignores elements inside STYLE or SCRIPT tags.
 * @param {Element} el - The DOM element to check
 * @param {string} value - The attribute value to search for
 * @param {boolean} [exact=false] - Whether to match exactly or as substring
 * @returns {boolean} True if the element has a matching attribute value or text content
 */
export function matchesAttribute(el, value, exact = false) {
  if (el == null) return false;
  if (value === undefined || value === null || value === '') return true;

  // Skip elements inside STYLE or SCRIPT tags
  if (isInsideStyleOrScript(el)) return false;

  const attrs = SEARCHABLE_ATTRIBUTES;

  // Check prioritized attributes first
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    let attrValue;
    try {
      attrValue = el.getAttribute(attr);
    } catch {
      continue;
    }
    if (attrValue) {
      if (exact ? attrValue === value : attrValue.includes(value)) {
        return true;
      }
    }
  }

  // Check direct text nodes (case-sensitive)
  const directText = getDirectText(el);
  if (exact ? directText === value : directText.includes(value)) {
    return true;
  }

  // Check full text content (includes nested elements, case-sensitive)
  const textContent = el.textContent;
  if (exact ? textContent.trim() === value : textContent.includes(value)) {
    return true;
  }

  return false;
}

/**
 * Checks if an element matches the specified type definition.
 * Uses pre-compiled matcher functions for better performance.
 * @param {Element} el - The DOM element to check
 * @param {string} type - The element type name (e.g., 'button', 'textbox')
 * @returns {boolean} True if the element matches the type definition
 */
export function matchesType(el, type) {
  if (el == null) return false;
  const matcher = TYPE_MATCHERS.get(type);
  return matcher ? matcher(el) : false;
}

/**
 * Gets all elements including shadow DOM contents.
 * @param {Document|Element} [root=document] - The root node to start traversal from
 * @returns {Element[]} Array of all elements found
 */
export function getAllElements(root = document) {
  const elements = [];
  if (root == null) return elements;
  const rootNode = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
  if (!rootNode) return elements;

  const stack = [rootNode];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;

    elements.push(node);

    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }

    try {
      if (node.shadowRoot) {
        const shadowChildren = node.shadowRoot.children;
        for (let i = shadowChildren.length - 1; i >= 0; i--) {
          stack.push(shadowChildren[i]);
        }
      }
    } catch {
      // Restricted shadow root - skip
    }
  }
  return elements;
}

/**
 * Gets all frames/iframes in the window (same-origin only).
 * @param {Window} [root=window] - The window object to search
 * @returns {Array<{window: Window, document: Document, isMainFrame: boolean, frameIndex: number}>} Array of frame objects
 */
export function getAllFrames(root = window) {
  const frames = [];
  try {
    frames.push({ window: root, document: root.document, isMainFrame: true, frameIndex: -1 });

    const iframes = root.document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      try {
        if (iframe.contentWindow && iframe.contentDocument) {
          frames.push({
            window: iframe.contentWindow,
            document: iframe.contentDocument,
            isMainFrame: false,
            frameElement: iframe,
            frameIndex: i
          });
        }
      } catch (e) {
        if (e.name === 'SecurityError') {
          console.warn('Skipping cross-origin iframe:', e.message);
        } else {
          console.warn('Error accessing iframe:', e.message);
        }
      }
    }
  } catch (e) {
    console.warn('Error getting frames:', e.message);
  }
  return frames;
}

/**
 * Gets the bounding box for an element.
 * @param {Element} el - The DOM element
 * @returns {{x: number, y: number, width: number, height: number, top: number, bottom: number, left: number, right: number, midx: number, midy: number, tagName: string}} Bounding box data
 */
export function getBoundingBox(el) {
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

/**
 * Finds elements matching the specified type.
 * Searches all frames (main document + iframes) by default.
 * @param {string} [type="element"] - Element type (see ELEMENT_DEFINITIONS for valid types)
 * @param {Element|null} [parent=null] - Parent element to search within
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findElementByType(type = "element", parent = null) {
  if (type === null || type === undefined) {
    type = "element";
  }

  if (typeof type !== 'string') {
    throw new TypeError(`type must be a string, got ${typeof type}`);
  }

  if (type && !ELEMENT_DEFINITIONS[type]) {
    console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`);
    return { elements: [] };
  }

  const matches = [];
  const frames = getAllFrames(window);

  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];

      if (type && !matchesType(el, type)) continue;

      matches.push({ element: el, frame: frame });
    }
  }

  // Get innermost matches (exclude parent elements that contain matched children)
  const innermostMatches = [];
  if (matches.length > 0) {
    const matchedElements = new Set(matches.map(m => m.element));
    const excludedElements = new Set();

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const el = match.element;

      if (!excludedElements.has(el)) {
        innermostMatches.unshift(match);
        let parentEl = el.parentElement;
        while (parentEl) {
          if (matchedElements.has(parentEl)) {
            excludedElements.add(parentEl);
          }
          parentEl = parentEl.parentElement;
        }
      }
    }
  }

  const qualified = innermostMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex
    };
  });

  return { elements: qualified };
}

/**
 * Finds elements matching the specified attribute value.
 * Searches all frames (main document + iframes) by default.
 * @param {string} value - The attribute value to search for
 * @param {boolean} [exact=false] - Exact match vs substring
 * @param {Element|null} [parent=null] - Parent element to search within
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findElementByAttributes(value, exact = false, parent = null) {
  if (value === null || value === undefined) {
    value = '';
  }

  if (typeof value !== 'string') {
    throw new TypeError(`value must be a string, got ${typeof value}`);
  }

  const matches = [];
  const frames = getAllFrames(window);

  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];

      if (!matchesAttribute(el, value, exact)) continue;

      matches.push({ element: el, frame: frame });
    }
  }

  // Get innermost matches (exclude parent elements that contain matched children)
  const innermostMatches = [];
  if (matches.length > 0) {
    const matchedElements = new Set(matches.map(m => m.element));
    const excludedElements = new Set();

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const el = match.element;

      if (!excludedElements.has(el)) {
        innermostMatches.unshift(match);
        let parentEl = el.parentElement;
        while (parentEl) {
          if (matchedElements.has(parentEl)) {
            excludedElements.add(parentEl);
          }
          parentEl = parentEl.parentElement;
        }
      }
    }
  }

  const qualified = innermostMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex
    };
  });

  return { elements: qualified };
}

/**
 * Extract elements array from various input formats.
 */
function extractElements(elements) {
  if (!elements) return [];
  if (elements && elements.elements && Array.isArray(elements.elements)) {
    return elements.elements;
  }
  return Array.isArray(elements) ? elements : [elements];
}

/**
 * Highlights elements on the page with a colored outline.
 * @param {Array|Object} elements - Elements to highlight (from findElementByType or findElementByAttributes result or array)
 * @param {string} [color='red'] - Outline color
 * @param {number} [width=3] - Outline width in pixels
 */
export function highlight(elements, color = 'red', width = 3) {
  const items = extractElements(elements);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const el = item.element ? item.element : item;
    if (el && el.style) {
      el.style.outline = `${width}px solid ${color}`;
      el.style.outlineOffset = '2px';
      el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
      el.classList.add('elementfinder-highlighted');
    }
  }
}

/**
 * Removes highlighting from elements.
 * @param {Array|Object} elements - Elements to unhighlight (from findElementByType or findElementByAttributes result or array)
 */
export function unhighlight(elements) {
  const items = extractElements(elements);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const el = item.element ? item.element : item;
    if (el && el.style) {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
      el.classList.remove('elementfinder-highlighted');
    }
  }
}

/**
 * Returns an array of all valid element type names.
 */
export function getValidTypes() {
  return Object.keys(ELEMENT_DEFINITIONS);
}

/**
 * Returns an array of all valid searchable attribute names.
 */
export function getValidAttributes() {
  return [...SEARCHABLE_ATTRIBUTES];
}