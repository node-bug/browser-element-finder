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
  if (expr == null || el == null) return false;
  
  expr = expr.trim();

  // Combined self::tag pattern check
  const selfMatch = expr.match(REGEX_PATTERNS.selfWithTag);
  if (selfMatch) {
    const tagName = selfMatch[1].toUpperCase();
    if (el.tagName !== tagName) return false;
    return selfMatch[2] ? parseXPath(selfMatch[2], el, depth + 1) : true;
  }
  
  // Combined attribute patterns - check contains, equals, exists in one pass
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

  // Check option text for select elements (dropdown matching) - before expensive textContent
  if (el.tagName === 'SELECT') {
    const options = el.querySelectorAll('option');
    for (const option of options) {
      const optionText = option.textContent.toLowerCase().trim();
      if (exact ? optionText === normalizedValue : optionText.includes(normalizedValue)) {
        return true;
      }
    }
  }

  // Also check full text content (includes nested elements) - most expensive, do last
  const textContent = el.textContent.toLowerCase().trim();
  if (exact ? textContent === normalizedValue : textContent.includes(normalizedValue)) {
    return true;
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

  // Use stack for iterative traversal to avoid recursion overhead
  const stack = [rootNode];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
    
    elements.push(node);

    // Add child elements to stack (reverse order for natural DOM order)
    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }

    // Traverse Shadow DOM securely
    try {
      if (node.shadowRoot) {
        // Push shadow root children onto stack
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
 * Expand column matches when a header cell (th) or data cell (td) is matched by text.
 * Finds all cells in the same column position within the same table.
 * Handles colspan by including all spanned column positions.
 * Optimized by caching table structures per table element.
 */
function expandColumnMatches(matches, text, exact, includeHidden, type) {
  // Only expand for 'column' type, not 'cell' type
  if (!text || type !== 'column') return matches;
  
  const expandedMatches = [];
  const seenElements = new Set();
  
  // Cache for table structures to avoid rebuilding for each match
  const tableCache = new Map();
  
  for (const match of matches) {
    const el = match.element;
    const frame = match.frame;
    
    if (!seenElements.has(el)) {
      expandedMatches.push(match);
      seenElements.add(el);
    }

    if (type === 'column') {
      const table = el.closest('table');
      if (!table) continue;
      
      let tableData = tableCache.get(table);
      if (!tableData) {
        tableData = buildTableColumnData(table);
        if (!tableData) continue;
        tableCache.set(table, tableData);
      }
      
      const colPosition = findElementColumnPosition(el, tableData.elementToCol);
      if (colPosition === null) continue;
      
      // Use for...of with find instead of find + loop
      const headerInfo = tableData.colPositions.find(info => colPosition >= info.colStart && colPosition <= info.colEnd);
      if (!headerInfo) continue;
      
      for (const rowData of tableData.rowColMaps) {
        for (let col = headerInfo.colStart; col <= headerInfo.colEnd; col++) {
          const cell = rowData.map.get(col);
          if (!cell || seenElements.has(cell)) continue;
          
          if (!includeHidden) {
            const cellWindow = cell.ownerDocument?.defaultView || frame.window;
            const style = cellWindow.getComputedStyle(cell);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            if (cell.offsetWidth === 0 || cell.offsetHeight === 0) continue;
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
 * Build column data for a table, including header positions and row maps.
 * Returns null if the table has no valid header row.
 * Builds a reverse lookup map for O(1) element-to-column-position queries.
 */
function buildTableColumnData(table) {
  const thead = table.querySelector('thead');
  if (!thead) return null;
  
  const headerRow = thead.querySelector('tr');
  if (!headerRow) return null;
  
  // Build column position map for header row
  const headerCells = Array.from(headerRow.children);
  const colPositions = [];
  let currentCol = 0;
  for (const cell of headerCells) {
    const colspan = parseInt(cell.getAttribute('colspan')) || 1;
    colPositions.push({ cell, colStart: currentCol, colEnd: currentCol + colspan - 1 });
    currentCol += colspan;
  }
  
  // Build column maps for all rows with reverse lookup for O(1) element-to-column queries
  const allRows = table.querySelectorAll('tr');
  const rowColMaps = [];
  const elementToCol = new Map(); // Reverse lookup: element -> column position
  
  for (const row of allRows) {
    const cells = Array.from(row.children);
    const rowColMap = new Map();
    let rowCol = 0;
    for (const cell of cells) {
      const colspan = parseInt(cell.getAttribute('colspan')) || 1;
      for (let i = 0; i < colspan; i++) {
        rowColMap.set(rowCol + i, cell);
        elementToCol.set(cell, rowCol + i); // Build reverse lookup
      }
      rowCol += colspan;
    }
    rowColMaps.push({ row, map: rowColMap, cells });
  }
  
  return { colPositions, rowColMaps, elementToCol };
}

/**
 * Find the column position of an element within its table using cached reverse lookup.
 * Returns the column index (0-based) or null if not found.
 * O(1) lookup using the pre-built elementToCol map.
 */
function findElementColumnPosition(el, elementToCol) {
  return elementToCol.get(el) ?? null;
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
  const expandedMatches = expandColumnMatches(innermostMatches, text, exact, includeHidden, type);

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