/**
 * Element Finder - Combined Module
 *
 * This module provides functionality to find elements by type and/or searchable attributes.
 * Combined implementation supporting both findElementsByType and findElementsByAttribute.
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

// Maximum length for text/textContent fallback descriptors
const MAX_IDENTIFIABLE_TEXT_LENGTH = 25;

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
 * Gets the current values of searchable attributes on an element.
 * Only returns attributes that exist on the element and have non-empty values.
 * @param {Element|null|undefined} el - The DOM element to inspect
 * @returns {Object.<string, string>} Attribute name to value map
 */
export function getSearchableAttributeValues(el) {
  if (el == null || el.nodeType !== Node.ELEMENT_NODE) return {};

  const values = {};
  const attrs = SEARCHABLE_ATTRIBUTES;

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    let attrValue;
    try {
      attrValue = el.getAttribute(attr);
    } catch {
      continue;
    }

    if (attrValue !== null && attrValue !== undefined && attrValue !== '') {
      values[attr] = attrValue;
    }
  }

  return values;
}

/**
 * Normalizes descriptor text for consistent matching.
 * @param {string|null|undefined} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeDescriptorText(text) {
  if (text == null) return '';
  return String(text).replace(/\s+/g, ' ').trim();
}

/**
 * Shortens text fallback descriptors without cutting words.
 * Uses only the first non-empty line so text after new lines is ignored.
 * @param {string|null|undefined} text - Text to shorten
 * @returns {string} Shortened normalized text
 */
function shortenDescriptorText(text) {
  if (text == null) return '';

  const lines = String(text).split(/\r\n|\r|\n/);
  let normalizedText = '';

  for (let i = 0; i < lines.length; i++) {
    normalizedText = normalizeDescriptorText(lines[i]);
    if (normalizedText) break;
  }

  if (!normalizedText || normalizedText.length <= MAX_IDENTIFIABLE_TEXT_LENGTH) {
    return normalizedText;
  }

  const shortened = normalizedText.slice(0, MAX_IDENTIFIABLE_TEXT_LENGTH);
  const lastSpaceIndex = shortened.lastIndexOf(' ');

  return lastSpaceIndex > 0 ? shortened.slice(0, lastSpaceIndex) : normalizedText;
}

/**
 * Gets the filename portion of an image src without path or extension.
 * @param {string|null|undefined} src - Image src value
 * @returns {string} Filename without path or extension
 */
function getImageFilenameWithoutExtension(src) {
  const normalizedSrc = normalizeDescriptorText(src);
  if (!normalizedSrc) return '';

  const withoutQueryOrFragment = normalizedSrc.split(/[?#]/)[0];
  const lastSlashIndex = Math.max(
    withoutQueryOrFragment.lastIndexOf('/'),
    withoutQueryOrFragment.lastIndexOf('\\')
  );
  const filenameWithExtension = lastSlashIndex >= 0
    ? withoutQueryOrFragment.slice(lastSlashIndex + 1)
    : withoutQueryOrFragment;

  const lastDotIndex = filenameWithExtension.lastIndexOf('.');
  return lastDotIndex > 0
    ? filenameWithExtension.slice(0, lastDotIndex)
    : filenameWithExtension;
}

/**
 * Gets the text content from elements referenced by aria-labelledby.
 * @param {Element} el - The DOM element to check
 * @returns {string} Concatenated resolved text from referenced elements, or empty string
 */
function getResolvedAriaLabelledByText(el) {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (!labelledBy) return '';

  const ids = labelledBy.split(/\s+/);
  const ownerDocument = el.ownerDocument || document;
  let text = '';

  for (const id of ids) {
    try {
      const refEl = ownerDocument.getElementById(id);
      if (!refEl) continue;

      const refText = normalizeDescriptorText(refEl.textContent);
      if (refText) {
        text = text ? `${text} ${refText}` : refText;
      }
    } catch {
      // Skip if element not found or access denied
    }
  }

  return text;
}

/**
 * Gets the first searchable attribute or text fallback identifiable text for an element.
 * @param {Element} el - The DOM element to describe
 * @returns {{attributeName: string|null, identifiableText: string}|null} Descriptor source and identifiable text
 */
function getElementDescriptorText(el) {
  const values = getSearchableAttributeValues(el);
  const attrs = SEARCHABLE_ATTRIBUTES;

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (!Object.prototype.hasOwnProperty.call(values, attr)) continue;

    const rawText = attr === 'aria-labelledby'
      ? getResolvedAriaLabelledByText(el)
      : attr === 'src'
        ? getImageFilenameWithoutExtension(values[attr])
        : values[attr];
    const identifiableText = normalizeDescriptorText(rawText);

    if (identifiableText) {
      return { attributeName: attr, identifiableText };
    }
  }

  const directText = shortenDescriptorText(getDirectText(el));
  if (directText) {
    return { attributeName: 'text', identifiableText: directText };
  }

  const fullText = shortenDescriptorText(el.textContent);
  if (fullText) {
    return { attributeName: 'text', identifiableText: fullText };
  }

  return null;
}

/**
 * Gets the root document to use for descriptor uniqueness checks.
 * @param {Element} el - The DOM element to describe
 * @returns {Document|null} The element's frame document, if available
 */
function getElementDescriptorFrame(el) {
  if (!el || !el.ownerDocument) return null;

  try {
    const frames = getAllFrames(window);
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].document === el.ownerDocument) {
        return frames[i].document;
      }
    }
  } catch {
    // Fall back to the element's owner document below
  }

  return el.ownerDocument;
}

/**
 * Gets occurrence index for descriptor text within the element's frame.
 * @param {Element} el - The element to describe
 * @param {string} text - Descriptor text to count
 * @returns {{index: number}} 1-based occurrence index
 */
function getElementDescriptorUniqueness(el, text) {
  const root = getElementDescriptorFrame(el);
  if (!root) {
    return { index: 1 };
  }

  const elements = getAllElements(root);
  let index = 1;
  let count = 0;

  for (let i = 0; i < elements.length; i++) {
    const candidate = elements[i];

    if (candidate !== el && (candidate === root.documentElement || candidate.tagName === 'BODY')) {
      continue;
    }

    const candidateDescriptor = getElementDescriptorText(candidate);

    if (!candidateDescriptor || candidateDescriptor.identifiableText !== text) continue;

    count++;
    if (candidate === el) {
      index = count;
    }
  }

  return { index };
}

/**
 * Gets the first matching semantic type for an element.
 * @param {Element} el - The DOM element to classify
 * @returns {string|null} Matching type name, or null for non-elements
 */
function getElementDescriptorType(el) {
  if (el == null || el.nodeType !== Node.ELEMENT_NODE) return null;

  const types = Object.keys(ELEMENT_DEFINITIONS);
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (type === 'element') continue;
    if (matchesType(el, type)) return type;
  }

  return 'element';
}

/**
 * Gets a plain-text identifier for a DOM element.
 * Uses the first non-empty searchable attribute value, falls back to element text,
 * reports occurrence index within the current frame, and includes the semantic element type.
 * @param {Element|null|undefined} el - The DOM element to describe
 * @returns {{identifiableText: string|null, attributeName: string|null, index: number, type: string|null, tagName: string|null}} Element descriptor
 */
export function getElementDescriptor(el) {
  if (el == null || el.nodeType !== Node.ELEMENT_NODE) {
    return {
      identifiableText: null,
      attributeName: null,
      index: 1,
      type: null,
      tagName: null
    };
  }

  const type = getElementDescriptorType(el);
  const descriptorSource = getElementDescriptorText(el);

  if (!descriptorSource) {
    return {
      identifiableText: null,
      attributeName: null,
      index: 1,
      type,
      tagName: el.tagName.toLowerCase()
    };
  }

  const uniqueness = getElementDescriptorUniqueness(el, descriptorSource.identifiableText);

  return {
    identifiableText: descriptorSource.identifiableText,
    attributeName: descriptorSource.attributeName,
    index: uniqueness.index,
    type,
    tagName: el.tagName.toLowerCase()
  };
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
 * Gets the text content from elements referenced by aria-labelledby.
 * @param {Element} el - The DOM element to check
 * @returns {string} Concatenated text from referenced elements, or empty string
 */
function getAriaLabelledByText(el) {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (!labelledBy) return '';
  
  const ids = labelledBy.split(/\s+/);
  let text = '';
  for (const id of ids) {
    try {
      const refEl = document.getElementById(id);
      if (refEl) {
        text += refEl.textContent;
      }
    } catch {
      // Skip if element not found or access denied
    }
  }
  return text;
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
      // Special handling for aria-labelledby - check both raw value and resolved text
      if (attr === 'aria-labelledby') {
        // First check if the raw attribute value contains the search string
        if (exact ? attrValue === value : attrValue.includes(value)) {
          return true;
        }
        // Then check the resolved text from referenced elements
        const resolvedText = getAriaLabelledByText(el);
        if (resolvedText) {
          if (exact ? resolvedText === value : resolvedText.includes(value)) {
            return true;
          }
        }
      } else if (exact ? attrValue === value : attrValue.includes(value)) {
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
 * Checks if an element is hidden (not visible on the page).
 * Considers offset dimensions, CSS visibility, display, and hidden attribute.
 * @param {Element} el - The DOM element to check
 * @returns {boolean} True if the element is hidden
 */
export function isHidden(el) {
  if (el == null) return true;

  // Check offset dimensions (element has no size)
  if (el.offsetWidth === 0 && el.offsetHeight === 0) {
    return true;
  }

  // Check computed styles for visibility and display
  try {
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.visibility === 'collapse') {
      return true;
    }
    if (style.display === 'none') {
      return true;
    }
  } catch {
    // Restricted access - continue with other checks
  }

  // Check hidden attribute
  if (el.hasAttribute('hidden')) {
    return true;
  }

  return false;
}

/**
 * Finds elements matching the specified type.
 * Searches all frames (main document + iframes) by default.
 * @param {string} [type="element"] - Element type (see ELEMENT_DEFINITIONS for valid types)
 * @param {Element|null} [parent=null] - Parent element to search within
 * @param {{failOnUnknownType?: boolean}} [options=null] - Search options
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findElementsByType(type = "element", parent = null, options = null) {
  if (type === null || type === undefined) {
    type = "element";
  }

  if (typeof type !== 'string') {
    throw new TypeError(`type must be a string, got ${typeof type}`);
  }

  const failOnUnknownType = options && options.failOnUnknownType === true;
  if (type && !ELEMENT_DEFINITIONS[type]) {
    const message = `Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`;
    if (failOnUnknownType) {
      throw new TypeError(`Unknown element type: ${type}`);
    }
    console.warn(message);
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
    const hidden = isHidden(item.element);

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex,
      isHidden: hidden
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
export function findElementsByAttribute(value, exact = false, parent = null) {
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

  // Filter out parent elements that ONLY match because they contain matching children
  // Keep elements that have their own independent match (attribute or direct text)
  const filteredMatches = matches.filter(item => {
    const el = item.element;
    // Check if this element has its own direct match (not just via descendant)
    const hasDirectMatch = hasOwnMatch(el, value, exact);
    if (hasDirectMatch) return true; // Keep elements with their own match
    
    // Check if any descendant also matches - if so, this parent is redundant
    for (const other of matches) {
      if (other.element !== el && el.contains(other.element)) {
        return false; // This element only matches via descendant
      }
    }
    return true;
  });

  const qualified = filteredMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();
    const hidden = isHidden(item.element);

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex,
      isHidden: hidden
    };
  });

  return { elements: qualified };
}

/**
 * Checks if an element has its own direct match (attribute or direct text),
 * not just via descendant elements.
 * @param {Element} el - The DOM element to check
 * @param {string} value - The attribute value to search for
 * @param {boolean} [exact=false] - Whether to match exactly or as substring
 * @returns {boolean} True if the element has its own direct match
 */
function hasOwnMatch(el, value, exact = false) {
  if (value === undefined || value === null || value === '') return true;

  const attrs = SEARCHABLE_ATTRIBUTES;

  // Check if any attribute on this element matches
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    let attrValue;
    try {
      attrValue = el.getAttribute(attr);
    } catch {
      continue;
    }
    if (attrValue) {
      // Special handling for aria-labelledby - check both raw value and resolved text
      if (attr === 'aria-labelledby') {
        // First check if the raw attribute value contains the search string
        if (exact ? attrValue === value : attrValue.includes(value)) {
          return true;
        }
        // Then check the resolved text from referenced elements
        const resolvedText = getAriaLabelledByText(el);
        if (resolvedText) {
          if (exact ? resolvedText === value : resolvedText.includes(value)) {
            return true;
          }
        }
      } else if (exact ? attrValue === value : attrValue.includes(value)) {
        return true;
      }
    }
  }

  // Check if direct text nodes match
  const directText = getDirectText(el);
  if (exact ? directText === value : directText.includes(value)) {
    return true;
  }

  return false;
}

/**
 * Gets counts of elements by semantic type and visibility on the current screen.
 * Excludes the generic `element` type unless a specific type is requested.
 * If no type is provided, returns counts for all defined non-generic types.
 * Searches all frames (main document + iframes) by default.
 * @param {string|null|undefined} [type=null] - Element type to count. If null/undefined, count all defined non-generic types.
 * @param {Element|null} [parent=null] - Parent element to count within
 * @param {{failOnUnknownType?: boolean}} [options=null] - Search options
 * @returns {Object.<string, {visible: number, hidden: number, total: number}>} Counts keyed by semantic element type, or `{ [type]: { visible, hidden, total } }` when type is provided
 */
export function getElementCounts(type = null, parent = null, options = null) {
  const hasType = type !== null && type !== undefined;

  if (hasType) {
    if (typeof type !== 'string') {
      throw new TypeError(`type must be a string, got ${typeof type}`);
    }
    if (!ELEMENT_DEFINITIONS[type]) {
      const message = `Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`;
      if (options && options.failOnUnknownType === true) {
        throw new TypeError(`Unknown element type: ${type}`);
      }
      console.warn(message);
      return { [type]: { visible: 0, hidden: 0, total: 0 } };
    }
  }

  const counts = {};
  const targetTypes = hasType ? [type] : Object.keys(ELEMENT_DEFINITIONS).filter((item) => item !== 'element');

  for (let i = 0; i < targetTypes.length; i++) {
    counts[targetTypes[i]] = { visible: 0, hidden: 0, total: 0 };
  }

  const frames = getAllFrames(window);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const allElements = getAllElements(parent || frame.document);

    for (let j = 0; j < allElements.length; j++) {
      const el = allElements[j];
      
      // Check against all target types and increment count for each match
      for (let k = 0; k < targetTypes.length; k++) {
        const targetType = targetTypes[k];
        if (matchesType(el, targetType)) {
          const bucket = isHidden(el) ? 'hidden' : 'visible';
          counts[targetType][bucket] += 1;
          counts[targetType].total += 1;
        }
      }
    }
  }

  return counts;
}

/**
 * Finds elements matching the specified type and/or attribute value.
 * Combines type and attribute matching in a single call.
 * @param {string|null} [type=null] - Element type (see ELEMENT_DEFINITIONS for valid types), or null for any type
 * @param {string|null} [text=null] - Text/attribute value to search for, or null/undefined/'' for any text
 * @param {boolean} [exact=false] - Exact match vs substring (only used when text is provided)
 * @param {Element|null} [parent=null] - Parent element to search within
 * @param {{failOnUnknownType?: boolean}} [options=null] - Search options
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findElements(type = null, text = null, exact = false, parent = null, options = null) {
  // Normalize text parameter
  if (text === null || text === undefined) {
    text = '';
  }

  // Validate type if provided
  if (type !== null && type !== undefined) {
    if (typeof type !== 'string') {
      throw new TypeError(`type must be a string, got ${typeof type}`);
    }
    if (!ELEMENT_DEFINITIONS[type]) {
      const message = `Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`;
      if (options && options.failOnUnknownType === true) {
        throw new TypeError(`Unknown element type: ${type}`);
      }
      console.warn(message);
      return { elements: [] };
    }
  }

  // Validate text if provided
  if (text !== '' && typeof text !== 'string') {
    throw new TypeError(`text must be a string, got ${typeof text}`);
  }

  const matches = [];
  const frames = getAllFrames(window);

  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];

      // Check type match if type is specified
      if (type !== null && type !== undefined && !matchesType(el, type)) continue;

      // Check attribute/text match if text is specified (non-empty)
      if (text !== '' && !matchesAttribute(el, text, exact)) continue;

      matches.push({ element: el, frame: frame });
    }
  }

  // Filter out parent elements that ONLY match because they contain matching children
  // Keep elements that have their own independent match (attribute or direct text)
  // Only apply this filter when text is provided (not for type-only searches)
  const filteredMatches = text !== '' 
    ? matches.filter(item => {
        const el = item.element;
        // Check if this element has its own direct match (not just via descendant)
        const hasDirectMatch = hasOwnMatch(el, text, exact);
        if (hasDirectMatch) return true; // Keep elements with their own match
        
        // Check if any descendant also matches - if so, this parent is redundant
        for (const other of matches) {
          if (other.element !== el && el.contains(other.element)) {
            return false; // This element only matches via descendant
          }
        }
        return true;
      })
    : matches; // For type-only searches, keep all matches (original behavior)

  const qualified = filteredMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();
    const hidden = isHidden(item.element);

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex,
      isHidden: hidden
    };
  });

  return { elements: qualified };
}

/**
 * Gets the parent element, handling shadow DOM elements.
 * For elements inside shadow roots, returns the shadow root's host element.
 * @param {Element} el - The element to get parent for
 * @returns {Element|null} - The parent element or shadow host
 */
function getParentElement(el) {
  // Try standard parentElement first
  if (el.parentElement) {
    return el.parentElement;
  }
  
  // For elements inside shadow roots, getRootNode() returns the shadow root
  // The shadow root has a 'host' property pointing to the custom element
  try {
    const rootNode = el.getRootNode();
    if (rootNode && rootNode.host) {
      return rootNode.host;
    }
  } catch {
    // Restricted shadow root - return null
  }
  
  return null;
}

/**
 * Gets siblings of an element, handling shadow DOM elements.
 * @param {Element} el - The element to get siblings for
 * @returns {Element[]} - Array of sibling elements
 */
function getSiblingElements(el) {
  const parent = getParentElement(el);
  if (!parent) return [];
  
  // If parent is a shadow root host, get children from the shadow root
  if (parent.shadowRoot) {
    try {
      return Array.from(parent.shadowRoot.children);
    } catch {
      // Restricted shadow root
      return [];
    }
  }
  
  return Array.from(parent.children);
}

/**
 * Finds a nearby element of the specified type relative to the given element.
 * Searches parent, then children, then siblings.
 * Handles shadow DOM elements by traversing through shadow boundaries.
 * @param {Element} el - The reference element
 * @param {string} targetType - The element type to find
 * @returns {Element|null} - Nearby element of target type, or null
 */
function findNearbyElementType(el, targetType) {
  // Check parent elements (including shadow host traversal)
  let parent = getParentElement(el);
  while (parent) {
    if (matchesType(parent, targetType)) {
      return parent;
    }
    parent = getParentElement(parent);
  }

  // Check immediate children only (not all descendants)
  // This prevents matching elements that are far away in the DOM tree
  const immediateChildren = el.children || [];
  for (const child of immediateChildren) {
    if (matchesType(child, targetType)) {
      return child;
    }
  }

  // Check siblings (including shadow DOM siblings)
  const siblings = getSiblingElements(el);
  for (const sibling of siblings) {
    if (sibling !== el && matchesType(sibling, targetType)) {
      return sibling;
    }
  }

  // Check descendants of siblings (for cases where the target element is nested within a sibling)
  for (const sibling of siblings) {
    if (sibling === el) continue;
    const siblingElements = getAllElements(sibling);
    for (let i = 0; i < siblingElements.length; i++) {
      if (matchesType(siblingElements[i], targetType)) {
        return siblingElements[i];
      }
    }
  }

  // Check siblings of ancestors (for cases where the target element is a sibling of the parent)
  // This handles structures like:
  // <div class="switch-row">
  //   <div><label>Label text</label></div>
  //   <label class="switch-cb"><input type="checkbox"></label>
  // </div>
  let ancestor = el.parentElement;
  while (ancestor) {
    const ancestorSiblings = getSiblingElements(ancestor);
    for (const sibling of ancestorSiblings) {
      if (sibling !== ancestor) {
        // Check the sibling itself
        if (matchesType(sibling, targetType)) {
          return sibling;
        }
        // Check descendants of the sibling
        const siblingElements = getAllElements(sibling);
        for (let i = 0; i < siblingElements.length; i++) {
          if (matchesType(siblingElements[i], targetType)) {
            return siblingElements[i];
          }
        }
      }
    }
    ancestor = ancestor.parentElement;
  }

  return null;
}

/**
 * Finds elements matching the specified type and/or attribute value.
 * When both type and text are provided but no element matches both,
 * finds elements matching the attribute/text and returns a nearby element of the specified type.
 * If only type is provided, delegates to findElementsByType.
 * If only text is provided, delegates to findElementsByAttribute.
 * @param {string|null|undefined} elementType - Element type (see ELEMENT_DEFINITIONS for valid types). If null/undefined/blank, matches any type.
 * @param {string|null|undefined} attributeText - Text/attribute value to search for. If null/undefined/blank, matches any text.
 * @param {boolean} [exact=false] - Exact match vs substring
 * @param {Element|null} [parent=null] - Parent element to search within
 * @param {{failOnUnknownType?: boolean}} [options=null] - Search options
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findProbableElements(elementType, attributeText, exact = false, parent = null, options = null) {
  // Normalize parameters
  const hasType = elementType !== null && elementType !== undefined && elementType !== '';
  const hasText = attributeText !== null && attributeText !== undefined && attributeText !== '';

  // If only type is provided, delegate to findElementsByType
  if (hasType && !hasText) {
    return findElementsByType(elementType, parent, options);
  }

  // If only text is provided, delegate to findElementsByAttribute
  if (!hasType && hasText) {
    return findElementsByAttribute(attributeText, exact, parent);
  }

  // Validate elementType if provided
  if (hasType) {
    if (typeof elementType !== 'string') {
      throw new TypeError(`elementType must be a string, got ${typeof elementType}`);
    }
    if (!ELEMENT_DEFINITIONS[elementType]) {
      const message = `Unknown element type: ${elementType}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`;
      if (options && options.failOnUnknownType === true) {
        throw new TypeError(`Unknown element type: ${elementType}`);
      }
      console.warn(message);
      return { elements: [] };
    }
  }

  // Validate attributeText if provided
  if (hasText) {
    if (typeof attributeText !== 'string') {
      throw new TypeError(`attributeText must be a string, got ${typeof attributeText}`);
    }
  }

  const matches = [];
  const frames = getAllFrames(window);

  // First, try to find elements matching both type and attribute text
  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];

      // Check type match if type is specified
      if (hasType && !matchesType(el, elementType)) continue;

      // Check attribute/text match if text is specified
      if (hasText && !matchesAttribute(el, attributeText, exact)) continue;

      matches.push({ element: el, frame: frame });
    }
  }

  // If no matches found with both criteria, try fallback: find attribute matches and get nearby type elements
  if (matches.length === 0 && hasType && hasText) {
    const attributeMatches = [];
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        // Check attribute match
        if (!matchesAttribute(el, attributeText, exact)) continue;
        // Only consider elements with their own direct match (not just via descendant)
        if (hasOwnMatch(el, attributeText, exact)) {
          attributeMatches.push({ element: el, frame: frame });
        }
      }
    }

    // For each attribute match, find a nearby element of the specified type
    // Use a Set to track already-found elements to avoid duplicates
    const foundElements = new Set();
    for (const match of attributeMatches) {
      const nearbyElement = findNearbyElementType(match.element, elementType);
      if (nearbyElement && !foundElements.has(nearbyElement)) {
        foundElements.add(nearbyElement);
        matches.push({ element: nearbyElement, frame: match.frame });
      }
    }
  }

  // Filter out parent elements that ONLY match because they contain matching children
  // Keep elements that have their own independent match (attribute or direct text)
  // Only apply this filter when attributeText is provided (not for type-only searches)
  const filteredMatches = hasText
    ? matches.filter(item => {
        const el = item.element;
        // Check if this element has its own direct match (not just via descendant)
        const hasDirectMatch = hasOwnMatch(el, attributeText, exact);
        if (hasDirectMatch) return true; // Keep elements with their own match
        
        // Check if any descendant also matches - if so, this parent is redundant
        for (const other of matches) {
          if (other.element !== el && el.contains(other.element)) {
            return false; // This element only matches via descendant
          }
        }
        return true;
      })
    : matches; // For type-only searches, keep all matches (original behavior)

  const qualified = filteredMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();
    const hidden = isHidden(item.element);

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex,
      isHidden: hidden
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
 * @param {Array|Object} elements - Elements to highlight (from findElementsByType or findElementsByAttribute result or array)
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
 * @param {Array|Object} elements - Elements to unhighlight (from findElementsByType or findElementsByAttribute result or array)
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
 * Global state for animation pausing (supports nested pause/resume)
 */
const animationPauseStack = [];

/**
 * Pauses all CSS animations and transitions on the page.
 * Stores original animation state for later restoration.
 * Supports nested calls - each pause() needs a corresponding resume().
 * @returns {Object} Object containing the restore function and state info
 */
export function pauseAnimations() {
  // Store original styles for restoration
  const originalStyles = new Map();
  const elements = getAllElements();

  for (const el of elements) {
    if (el && el.style) {
      // Only store and modify if not already paused
      if (el.style.animationPlayState !== 'paused') {
        originalStyles.set(el, {
          animationPlayState: el.style.animationPlayState,
          transitionProperty: el.style.transitionProperty,
          webkitAnimationPlayState: el.style.webkitAnimationPlayState,
          webkitTransitionProperty: el.style.webkitTransitionProperty,
        });

        // Pause animations and disable transitions
        el.style.animationPlayState = 'paused';
        el.style.transitionProperty = 'none';
        el.style.webkitAnimationPlayState = 'paused';
        el.style.webkitTransitionProperty = 'none';
      }
    }
  }

  // Also pause animations on document level via CSSOM
  // Only add stylesheet if not already present
  let styleSheet = document.getElementById('elementfinder-animation-pause');
  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.id = 'elementfinder-animation-pause';
    styleSheet.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition-property: none !important;
        -webkit-animation-play-state: paused !important;
        -webkit-transition-property: none !important;
      }
      @media (prefers-reduced-motion: no-preference) {
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Push to stack for nested support
  const pauseState = { originalStyles, pausedCount: originalStyles.size };
  animationPauseStack.push(pauseState);

  return pauseState;
}

/**
 * Resumes all CSS animations and transitions that were previously paused.
 * Supports nested calls - only removes stylesheet when stack is empty.
 * @param {Object} [pauseState] - Optional state object from pauseAnimations(). If omitted, pops the most recent pause.
 */
export function resumeAnimations(pauseState) {
  // If no pauseState provided, pop the most recent from stack (for Selenium/browser use)
  if (!pauseState) {
    if (animationPauseStack.length === 0) return;
    pauseState = animationPauseStack.pop();
  } else {
    // If pauseState provided, remove it from stack
    const index = animationPauseStack.indexOf(pauseState);
    if (index === -1) return; // Not found in stack
    animationPauseStack.splice(index, 1);
  }

  // Restore original styles
  const originalStyles = pauseState.originalStyles;
  if (originalStyles) {
    for (const [el, styles] of originalStyles) {
      if (el && el.style) {
        el.style.animationPlayState = styles.animationPlayState || '';
        el.style.transitionProperty = styles.transitionProperty || '';
        el.style.webkitAnimationPlayState = styles.webkitAnimationPlayState || '';
        el.style.webkitTransitionProperty = styles.webkitTransitionProperty || '';
      }
    }
  }

  // Only remove stylesheet when stack is empty (all pauses resolved)
  if (animationPauseStack.length === 0) {
    const styleSheet = document.getElementById('elementfinder-animation-pause');
    if (styleSheet) {
      styleSheet.remove();
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