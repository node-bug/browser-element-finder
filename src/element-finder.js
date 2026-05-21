/**
 * Browser Element Finder - Node.js Module Version
 * 
 * This is the canonical source for the element finder library.
 * The build script generates index.js for browser injection.
 */

import searchableAttributesData from './searchable-attributes.json' with { type: 'json' };
import elementDefinitionsData from './element-definitions.json' with { type: 'json' };

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

/**
 * Parses an XPath-like expression for element type matching.
 * Supports conditions like self::tag, @attr='value', contains(), descendant::, ancestor::*
 * @param {string} expr - The XPath-like expression to parse
 * @param {Element} el - The DOM element to test against
 * @param {number} [depth=0] - Current recursion depth (internal use)
 * @returns {boolean} True if the element matches the expression
 */
export function parseXPath(expr, el, depth = 0) {
  // Handle null/undefined inputs gracefully
  if (expr == null || el == null) {
    return false;
  }
  
  // Prevent stack overflow from deeply nested expressions
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error('XPath expression exceeds maximum recursion depth');
  }
  
  expr = expr.trim();
  if (expr === 'true()') return true;
  
  // Handle outermost matching parentheses
  if (expr.startsWith('(') && expr.endsWith(')')) {
    // Ensure the parentheses are actually matching pairs balancing the expression
    let parenDepth = 0;
    let matchedAll = true;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') parenDepth++;
      else if (expr[i] === ')') parenDepth--;
      if (parenDepth === 0 && i < expr.length - 1) {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) {
      return parseXPath(expr.slice(1, -1), el, depth + 1);
    }
  }
  
  // Split by ' or ' for OR conditions (outermost first)
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
      
      // Check for operator at boundary (use precompiled pattern)
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
  // Handle null/undefined inputs gracefully
  if (expr == null || el == null) {
    return false;
  }
  
  expr = expr.trim();

  // Handle self::tag[@attr='value'] or self::tag
  let match = expr.match(REGEX_PATTERNS.selfWithTag);
  if (match) {
    const tagName = match[1].toUpperCase();
    if (el.tagName !== tagName) return false;
    if (match[2]) {
      return parseXPath(match[2], el, depth + 1);
    }
    return true;
  }
  
  // Handle contains(@attr, 'value') - Now accepts dynamic spaces inside quotes safely
  match = expr.match(REGEX_PATTERNS.contains);
  if (match) {
    const attr = el.getAttribute(match[1]) || '';
    return attr.toLowerCase().includes(match[2].toLowerCase());
  }
  
  // Handle @attr='value'
  match = expr.match(REGEX_PATTERNS.attrEquals);
  if (match) {
    return el.getAttribute(match[1]) === match[2];
  }
  
  // Handle @attr (attribute exists check)
  match = expr.match(REGEX_PATTERNS.attrExists);
  if (match) {
    return el.hasAttribute(match[1]);
  }
  
  // Handle descendant::tag
  match = expr.match(REGEX_PATTERNS.descendant);
  if (match) {
    return el.querySelector(match[1]) !== null;
  }
  
  // Handle ancestor::*[condition]
  match = expr.match(REGEX_PATTERNS.ancestor);
  if (match) {
    let parent = el.parentElement;
    while (parent) {
      if (parseXPath(match[1], parent, depth + 1)) return true;
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

// Searchable attributes (in priority order) - internal state
let SEARCHABLE_ATTRIBUTES = searchableAttributesData;

/**
 * Sets custom searchable attributes for text matching.
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
 * Checks if an element matches the specified type definition.
 * @param {Element} el - The DOM element to check
 * @param {string} type - The element type name (e.g., 'button', 'textbox')
 * @returns {boolean} True if the element matches the type definition
 */
export function matchesType(el, type) {
  if (el == null) return false;
  const expr = ELEMENT_DEFINITIONS[type];
  return expr ? parseXPath(expr, el) : false;
}

/**
 * Checks if an element matches the specified text content.
 * Searches attributes, direct text nodes, and full text content.
 * @param {Element} el - The DOM element to check
 * @param {string} value - The text value to search for
 * @param {boolean} [exact=false] - Whether to match exactly or as substring
 * @returns {boolean} True if the element contains the text
 */
export function matchesContent(el, value, exact = false) {
  if (el == null) return false;
  if (value === undefined || value === null || value === '') return true;
  const normalizedValue = value.toLowerCase().trim();

  // Check prioritized attributes
  for (const attr of SEARCHABLE_ATTRIBUTES) {
    let attrValue;
    try {
      attrValue = el.getAttribute(attr);
    } catch {
      // Element may be in an invalid state, skip this attribute
      continue;
    }
    if (attrValue) {
      const normalized = attrValue.toLowerCase().trim();
      if (exact ? normalized === normalizedValue : normalized.includes(normalizedValue)) {
        return true;
      }
    }
  }

  // Check direct text nodes first
  const directText = Array.from(el.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .toLowerCase()
    .trim();

  if (exact ? directText === normalizedValue : directText.includes(normalizedValue)) {
    return true;
  }

  // Also check full text content (includes nested elements)
  const textContent = el.textContent.toLowerCase().trim();
  if (exact ? textContent === normalizedValue : textContent.includes(normalizedValue)) {
    return true;
  }

  // Check option text for select elements (dropdown matching)
  if (el.tagName === 'SELECT') {
    const options = el.querySelectorAll('option');
    for (const option of options) {
      const optionText = option.textContent.toLowerCase().trim();
      if (exact ? optionText === normalizedValue : optionText.includes(normalizedValue)) {
        return true;
      }
    }
  }

  return false;
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
 * Gets all elements including shadow DOM contents.
 * @param {Document|Element} [root=document] - The root node to start traversal from
 * @returns {Element[]} Array of all elements found
 */
export function getAllElements(root = document) {
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
    try {
      if (node.shadowRoot) {
        elements.push(...getAllElements(node.shadowRoot));
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
 * @param {number} [maxFrames=Infinity] - Maximum number of frames to return
 * @returns {Array<{window: Window, document: Document, isMainFrame: boolean, frameIndex: number}>} Array of frame objects
 */
export function getAllFrames(root = window, maxFrames = Infinity) {
  const frames = [];
  try {
    // Add the main window/document as the first "frame" with index -1
    frames.push({ window: root, document: root.document, isMainFrame: true, frameIndex: -1 });
    
    // Get all iframes with 0-based index (respecting maxFrames limit)
    const iframes = root.document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length && frames.length < maxFrames; i++) {
      const iframe = iframes[i];
      try {
        // Only access same-origin frames
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
        // Distinguish SecurityError (cross-origin) from other errors
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
 * Expand column matches when a header cell (th) is matched by text.
 * Finds all cells in the same column position within the same table.
 * Handles colspan by including all spanned column positions.
 * Optimized from O(n²) to O(n) by building column position maps.
 */
function expandColumnMatches(matches, text, exact, includeHidden) {
  if (!text) return matches;
  
  const expandedMatches = [];
  const seenElements = new Set(); // O(1) lookup instead of Array.some()
  
  for (const match of matches) {
    const el = match.element;
    const frame = match.frame;
    
    // Always include the original match
    if (!seenElements.has(el)) {
      expandedMatches.push(match);
      seenElements.add(el);
    }

    // Only expand if it's a header cell (th)
    if (el.tagName.toLowerCase() === 'th') {
      const table = el.closest('table');
      if (!table) continue;
      
      const headerRow = el.closest('tr');
      if (!headerRow) continue;
      
      // Build column position map for header row (O(n) instead of O(n²))
      // Each cell maps to its starting column and colspan span
      const headerCells = Array.from(headerRow.children);
      const colPositions = [];
      let currentCol = 0;
      for (const cell of headerCells) {
        const colspan = parseInt(cell.getAttribute('colspan')) || 1;
        colPositions.push({ cell, colStart: currentCol, colEnd: currentCol + colspan - 1 });
        currentCol += colspan;
      }
      
      // Find the matched header's column range (handles colspan)
      const headerInfo = colPositions.find(info => info.cell === el);
      if (!headerInfo) continue;
      
      // Find all rows in the table and collect cells at the spanned column positions
      const allRows = table.querySelectorAll('tr');
      for (const row of allRows) {
        const cells = Array.from(row.children);
        
        // Build column position map for this row (O(n))
        const rowColMap = new Map();
        let rowCol = 0;
        for (const cell of cells) {
          const colspan = parseInt(cell.getAttribute('colspan')) || 1;
          for (let i = 0; i < colspan; i++) {
            rowColMap.set(rowCol + i, cell);
          }
          rowCol += colspan;
        }
        
        // Add cells at each column position spanned by the header
        for (let col = headerInfo.colStart; col <= headerInfo.colEnd; col++) {
          const cell = rowColMap.get(col);
          if (!cell) continue;
          
          // Skip if already added
          if (seenElements.has(cell)) continue;
          
          // Check visibility if needed
          if (!includeHidden) {
            const cellWindow = cell.ownerDocument?.defaultView || frame.window;
            const style = cellWindow.getComputedStyle(cell);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              continue;
            }
            if (cell.offsetWidth === 0 || cell.offsetHeight === 0) {
              continue;
            }
          }
          
          expandedMatches.push({ element: cell, frame: frame });
          seenElements.add(cell);
        }
      }
    }
  }
  
  return expandedMatches;
}

/**
 * Finds elements matching the specified criteria.
 * Searches all frames (main document + iframes) by default.
 * @param {string} [type="element"] - Element type (see ELEMENT_DEFINITIONS for valid types)
 * @param {string|null} [text=null] - Text to search for in content/attributes
 * @param {boolean} [exact=false] - Exact text match vs substring
 * @param {boolean} [includeHidden=false] - Include hidden elements
 * @param {Element|null} [parent=null] - Parent element to search within
 * @param {number} [maxFrames=Infinity] - Maximum number of frames to search
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number}>}} Found elements with metadata
 */
export function findElement(type = "element", text = null, exact = false, includeHidden = false, parent = null, maxFrames = Infinity) {
  // Handle null/undefined type - default to "element"
  if (type === null || type === undefined) {
    type = "element";
  }
  
  // Validate type parameter is a string
  if (typeof type !== 'string') {
    throw new TypeError(`type must be a string, got ${typeof type}`);
  }
  
  // Validate type if provided
  if (type && !ELEMENT_DEFINITIONS[type]) {
    console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`);
    return { elements: [] };
  }

  const matches = [];
  const frames = getAllFrames(window, maxFrames);

  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (const el of allElements) {
      // Check type match if specified
      if (type && !matchesType(el, type)) continue;

      // Check text/attribute match if specified
      if (text !== undefined && !matchesContent(el, text, exact)) continue;

      // Check visibility (early exit on first hidden property)
      if (!includeHidden) {
        const elWindow = el.ownerDocument?.defaultView || frame.window;
        const style = elWindow.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          continue;
        }
        if (el.offsetWidth === 0 || el.offsetHeight === 0) {
          continue;
        }
      }

      matches.push({ element: el, frame: frame });
    }
  }

  // Filter to keep only innermost elements (remove ancestors that have matching descendants)
  // O(n) algorithm: use Set for O(1) lookup, process in reverse to mark ancestors
  const innermostMatches = [];
  if (matches.length > 0) {
    // Create a Set of all matched elements for O(1) lookup
    const matchedElements = new Set(matches.map(m => m.element));
    // Elements to exclude (ancestors that have descendant matches)
    const excludedElements = new Set();
    
    // Process in reverse order - deeper elements first
    // When we find an element, mark all its ancestors (that are in matches) as excluded
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const el = match.element;
      
      if (!excludedElements.has(el)) {
        innermostMatches.unshift(match);
        // Mark all ancestors that are in matches as excluded
        let parent = el.parentElement;
        while (parent) {
          if (matchedElements.has(parent)) {
            excludedElements.add(parent);
          }
          parent = parent.parentElement;
        }
      }
    }
  }

  // Expand column matches when a header cell is matched by text
  // This finds all cells in the same column within the same table
  const expandedMatches = expandColumnMatches(innermostMatches, text, exact, includeHidden);

  // Build results with bounding boxes and tag names
  // For iframe elements, we need to serialize the element data since DOM elements
  // from different frames cannot be passed across frame boundaries
  const qualified = expandedMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();
    
    // For iframe elements, only return serializable data (no raw element reference)
    // This is because DOM elements from different frames cannot be serialized
    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex
      };
    }
    
    // For main frame elements, include the raw element reference
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
 * Handles raw objects, raw nodes, or API results wrapper payloads.
 * @param {Array|Object} elements - Input elements in various formats
 * @returns {Array} Normalized array of element items
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
 * @param {Array<{element: Element}|Element>} elements - Elements to highlight (accepts wrapper objects or raw elements)
 * @param {string} [color='red'] - Outline color
 * @param {number} [width=3] - Outline width in pixels
 */
export function highlight(elements, color = 'red', width = 3) {
  const items = extractElements(elements);

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

/**
 * Removes highlighting from elements.
 * @param {Array<{element: Element}|Element>} elements - Elements to remove highlighting from (accepts wrapper objects or raw elements)
 */
export function unhighlight(elements) {
  const items = extractElements(elements);

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

/**
 * Returns an array of all valid element type names.
 * @returns {string[]} Array of valid type names
 */
export function getValidTypes() {
  return Object.keys(ELEMENT_DEFINITIONS);
}