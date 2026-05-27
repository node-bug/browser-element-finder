/**
 * Browser Element Finder - Node.js Module Version
 *
 * Finds elements by type using XPath-like definitions.
 */

import elementDefinitionsData from './element-definitions.json' with { type: 'json' };

// Precompiled regex patterns for performance
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

const MAX_RECURSION_DEPTH = 100;

// Pre-compiled type matcher functions
const TYPE_MATCHERS = new Map();

for (const [type, expr] of Object.entries(elementDefinitionsData)) {
  if (expr === 'true()') {
    TYPE_MATCHERS.set(type, () => true);
  } else {
    TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el));
  }
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
 * @type {Object.<string, string>}
 */
export const ELEMENT_DEFINITIONS = Object.freeze(elementDefinitionsData);

/**
 * Checks if an element matches the specified type definition.
 * @param {Element} el - The DOM element to check
 * @param {string} type - The element type name
 * @returns {boolean} True if the element matches the type
 */
export function matchesType(el, type) {
  if (el == null) return false;
  const matcher = TYPE_MATCHERS.get(type);
  return matcher ? matcher(el) : false;
}

/**
 * Gets direct text content from an element's text nodes.
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
 * Checks if an element is inside a STYLE or SCRIPT tag.
 * @param {Element} el - The DOM element to check
 * @returns {boolean} True if the element is inside a STYLE or SCRIPT tag
 */
function isInsideStyleOrScript(el) {
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
 * Checks if an element matches the specified text content.
 * Searches through text content. Ignores elements inside STYLE or SCRIPT tags.
 * @param {Element} el - The DOM element to check
 * @param {string} value - The text value to search for
 * @param {boolean} [exact=false] - Whether to match exactly or as substring
 * @returns {boolean} True if the element has matching text content
 */
function matchesContent(el, value, exact = false) {
  if (el == null) return false;
  if (value === undefined || value === null || value === '') return true;

  // Skip elements inside STYLE or SCRIPT tags
  if (isInsideStyleOrScript(el)) return false;

  // Check direct text nodes
  const directText = getDirectText(el);
  if (exact ? directText === value : directText.includes(value)) {
    return true;
  }

  // Check full text content
  const textContent = el.textContent;
  if (exact ? textContent === value : textContent.includes(value)) {
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
 * Expand column matches when a header cell (th) or data cell (td) is matched by text.
 * Finds all cells in the same column position within the same table.
 * Handles colspan by including all spanned column positions.
 * Optimized by caching table structures per table element.
 */
function expandColumnMatches(matches, text, type) {
  if (!text || type !== 'column') return matches;

  const expandedMatches = [];
  const seenElements = new Set();

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

      const headerInfo = tableData.colPositions.find(info => colPosition >= info.colStart && colPosition <= info.colEnd);
      if (!headerInfo) continue;

      for (const rowData of tableData.rowColMaps) {
        for (let col = headerInfo.colStart; col <= headerInfo.colEnd; col++) {
          const cell = rowData.map.get(col);
          if (!cell || seenElements.has(cell)) continue;

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
 */
function buildTableColumnData(table) {
  const thead = table.querySelector('thead');
  if (!thead) return null;

  const headerRow = thead.querySelector('tr');
  if (!headerRow) return null;

  const headerCells = Array.from(headerRow.children);
  const colPositions = [];
  let currentCol = 0;
  for (let i = 0; i < headerCells.length; i++) {
    const cell = headerCells[i];
    const colspan = parseInt(cell.getAttribute('colspan')) || 1;
    colPositions.push({ cell, colStart: currentCol, colEnd: currentCol + colspan - 1 });
    currentCol += colspan;
  }

  const allRows = table.querySelectorAll('tr');
  const rowColMaps = [];
  const elementToCol = new Map();

  for (let r = 0; r < allRows.length; r++) {
    const row = allRows[r];
    const cells = Array.from(row.children);
    const rowColMap = new Map();
    let rowCol = 0;
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const colspan = parseInt(cell.getAttribute('colspan')) || 1;
      for (let k = 0; k < colspan; k++) {
        rowColMap.set(rowCol + k, cell);
        elementToCol.set(cell, rowCol + k);
      }
      rowCol += colspan;
    }
    rowColMaps.push({ row, map: rowColMap, cells });
  }

  return { colPositions, rowColMaps, elementToCol };
}

/**
 * Find the column position of an element within its table.
 */
function findElementColumnPosition(el, elementToCol) {
  return elementToCol.get(el) ?? null;
}

/**
 * Comprehensive visibility check for an element.
 * Checks multiple ways an element can be hidden/invisible:
 * - CSS display, visibility, opacity
 * - Dimensions (offsetWidth, offsetHeight)
 * - Parent visibility (recursive)
 * - Off-screen positioning (left: -9999px, text-indent, etc.)
 * - aria-hidden attribute
 * - visibility: collapse (for table elements)
 * 
 * @param {Element} el - The element to check
 * @param {Window} elWindow - The window object for the element
 * @returns {boolean} True if element is hidden, false if visible
 */
function isElementHidden(el, elWindow) {
  const style = elWindow.getComputedStyle(el);
  
  // Check CSS display, visibility, opacity
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true;
  }
  
  // Check visibility: collapse (for table elements)
  if (style.visibility === 'collapse') {
    return true;
  }
  
  // Check dimensions
  if (el.offsetWidth === 0 || el.offsetHeight === 0) {
    return true;
  }
  
  // Check aria-hidden attribute
  const ariaHidden = el.getAttribute('aria-hidden');
  if (ariaHidden === 'true') {
    return true;
  }
  
  // Check parent visibility recursively
  let parent = el.parentElement;
  while (parent) {
    const parentStyle = elWindow.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
      return true;
    }
    parent = parent.parentElement;
  }
  
  // Check for off-screen positioning techniques
  const rect = el.getBoundingClientRect();
  
  // Check for position: absolute with off-screen coordinates
  if (style.position === 'absolute' || style.position === 'fixed') {
    const left = parseInt(style.left) || 0;
    const top = parseInt(style.top) || 0;
    // Common off-screen positioning: left/top: -9999px or similar
    if ((left < -1000 && left !== -Infinity) || (top < -1000 && top !== -Infinity)) {
      return true;
    }
    // Check if element is positioned outside the viewport with hidden overflow
    if (rect.bottom < -1000 || rect.right < -1000 || rect.top > (elWindow.innerHeight + 1000) || rect.left > (elWindow.innerWidth + 1000)) {
      return true;
    }
  }
  
  // Check for text-indent: -9999px (common for icon-only elements misuse)
  const textIndent = parseInt(style.textIndent) || 0;
  if (textIndent < -1000) {
    return true;
  }
  
  // Check for clip-path that hides the element
  if (style.clipPath && style.clipPath !== 'none') {
    if (style.clipPath.includes('inset(100%)') || style.clipPath.includes('circle(0)') || style.clipPath.includes('polygon(0% 0%,0% 0%,0% 0%,0% 0%)')) {
      return true;
    }
  }
  
  // Check for size: 0 (CSS trick to hide elements)
  if ((style.width === '0' && style.height === '0') || (style.width === '0px' && style.height === '0px')) {
    // But allow if element has natural content dimensions (offsetWidth/offsetHeight > 0)
    if (el.offsetWidth === 0 && el.offsetHeight === 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculates the Euclidean distance between two elements based on their centroids.
 * @param {Element} el1 - First DOM element
 * @param {Element} el2 - Second DOM element
 * @returns {number} Distance between the elements
 */
function calculateDistance(el1, el2) {
  const box1 = getBoundingBox(el1);
  const box2 = getBoundingBox(el2);
  
  // Calculate distance between centroids
  const dx = box1.midx - box2.midx;
  const dy = box1.midy - box2.midy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Finds the nearest element from a list of candidates based on distance from reference element.
 * @param {Element} referenceElement - The reference element
 * @param {Element[]} candidates - Array of candidate elements to choose from
 * @returns {Element|null} The nearest element or null if no candidates
 */
function findNearestElement(referenceElement, candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  let nearest = candidates[0];
  let minDistance = calculateDistance(referenceElement, nearest);
  
  for (let i = 1; i < candidates.length; i++) {
    const distance = calculateDistance(referenceElement, candidates[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = candidates[i];
    }
  }
  
  return nearest;
}

/**
 * Filters matches to only innermost elements (excludes parent elements).
 * Also deduplicates when both a label and its associated control are present,
 * preferring the control element over the label.
 * @param {Array<{element: Element, frame: Object, isVisible: boolean}>} matches - Matches to filter
 * @returns {Array<{element: Element, frame: Object, isVisible: boolean}>} Filtered innermost matches
 */
function filterToInnermost(matches) {
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

  // Deduplicate: when both a label and its associated control are in results, keep only the control
  const finalMatches = [];
  const labelableElements = new Set(['BUTTON', 'INPUT', 'KEYGEN', 'METER', 'OUTPUT', 'PROGRESS', 'SELECT', 'TEXTAREA']);
  const seenElements = new Set();

  for (const match of innermostMatches) {
    const el = match.element;
    
    if (seenElements.has(el)) continue;
    seenElements.add(el);

    // If this is a label, check if any of its associated controls are also in the results
    if (el.tagName === 'LABEL') {
      let hasAssociatedControl = false;

      // Check for control with matching "for" attribute
      if (el.htmlFor) {
        const control = el.ownerDocument.getElementById(el.htmlFor);
        if (control && seenElements.has(control)) {
          hasAssociatedControl = true;
        }
      }

      // Check for nested control
      if (!hasAssociatedControl) {
        for (const labelableTag of labelableElements) {
          const control = el.querySelector(labelableTag.toLowerCase());
          if (control && seenElements.has(control)) {
            hasAssociatedControl = true;
            break;
          }
        }
      }

      // Skip this label if it has an associated control in the results
      if (hasAssociatedControl) continue;
    }

    finalMatches.push(match);
  }

  return finalMatches;
}

/**
 * Formats match results into the standard return format.
 * @param {Array<{element: Element, frame: Object, isVisible: boolean}>} expandedMatches - Matches to format
 * @returns {{elements: Array}} Formatted results
 */
function formatResults(expandedMatches) {
  const qualified = expandedMatches.map(item => {
    const boundingBox = getBoundingBox(item.element);
    const tagName = item.element.tagName.toLowerCase();

    if (!item.frame.isMainFrame) {
      return {
        boundingBox: boundingBox,
        tagName: tagName,
        frameIndex: item.frame.frameIndex,
        isVisible: item.isVisible
      };
    }

    return {
      element: item.element,
      boundingBox: boundingBox,
      tagName: tagName,
      frameIndex: item.frame.frameIndex,
      isVisible: item.isVisible
    };
  });

  return { elements: qualified };
}

/**
 * Finds elements matching the specified criteria.
 * Strategy:
 * 1. First, find elements matching both type and searchable attributes (text)
 * 2. If no match found, find any element by searchable attributes
 * 3. For each attribute-matched element, find the nearest element of the requested type
 * Searches all frames (main document + iframes) by default.
 * @param {string} [type="element"] - Element type (see ELEMENT_DEFINITIONS for valid types)
 * @param {string|null} [text=null] - Text to search for in content/attributes
 * @param {boolean} [exact=false] - Exact text match vs substring
 * @param {Element|null} [parent=null] - Parent element to search within
 * @returns {{elements: Array<{element: Element|undefined, boundingBox: Object, tagName: string, frameIndex: number, isVisible: boolean}>}} Found elements with metadata
 */
export function findElement(type = "element", text = null, exact = false, parent = null) {
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

  const frames = getAllFrames(window);
  const typeAndTextMatches = [];
  const attributeMatches = [];

  // First pass: Collect all elements matching type+text and all elements matching text
  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];

      const typeMatches = type && matchesType(el, type);
      const textMatches = text === undefined || text === null || matchesContent(el, text, exact);

      if (typeMatches && textMatches) {
        const elWindow = el.ownerDocument?.defaultView || frame.window;
        const isVisible = !isElementHidden(el, elWindow);
        typeAndTextMatches.push({ element: el, frame: frame, isVisible });
      }

      // Collect elements matching text (for fallback to nearest matching element)
      if (text && matchesContent(el, text, exact)) {
        attributeMatches.push({ element: el, frame: frame });
      }
    }
  }

  // Strategy 1: If we found elements matching both type and text, use those
  if (typeAndTextMatches.length > 0) {
    const innermostMatches = filterToInnermost(typeAndTextMatches);
    const expandedMatches = expandColumnMatches(innermostMatches, text, type);
    return formatResults(expandedMatches);
  }

  // Strategy 2: If no type+text match but text was provided, find by text then find nearest by type
  if (text && attributeMatches.length > 0) {
    const resultsByNearestType = [];
    const seenElements = new Set();

    for (const textMatch of attributeMatches) {
      const textEl = textMatch.element;
      if (seenElements.has(textEl)) continue;

      // Find all elements of the requested type in the same frame
      const frame = textMatch.frame;
      const typeElements = [];
      const allElements = getAllElements(parent || frame.document);

      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (matchesType(el, type)) {
          typeElements.push(el);
        }
      }

      // Find the nearest type-matched element to the text-matched element
      if (typeElements.length > 0) {
        const nearest = findNearestElement(textEl, typeElements);
        if (nearest) {
          const elWindow = nearest.ownerDocument?.defaultView || frame.window;
          const isVisible = !isElementHidden(nearest, elWindow);
          resultsByNearestType.push({ element: nearest, frame: frame, isVisible });
          seenElements.add(nearest);
        }
      }
    }

    if (resultsByNearestType.length > 0) {
      const innermostMatches = filterToInnermost(resultsByNearestType);
      const expandedMatches = expandColumnMatches(innermostMatches, text, type);
      return formatResults(expandedMatches);
    }
  }

  // Strategy 3: If no text match or no type match, just return elements matching type
  if (type && type !== "element") {
    const typeMatches = [];

    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);

      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (matchesType(el, type)) {
          const elWindow = el.ownerDocument?.defaultView || frame.window;
          const isVisible = !isElementHidden(el, elWindow);
          typeMatches.push({ element: el, frame: frame, isVisible });
        }
      }
    }

    if (typeMatches.length > 0) {
      const innermostMatches = filterToInnermost(typeMatches);
      const expandedMatches = expandColumnMatches(innermostMatches, text, type);
      return formatResults(expandedMatches);
    }
  }

  return { elements: [] };
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
 */
export function highlight(elements, color = 'red', width = 3) {
  const items = extractElements(elements);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const el = item && item.element ? item.element : item;
    if (el && typeof el === 'object' && 'style' in el) {
      el.style.outline = `${width}px solid ${color}`;
      el.style.outlineOffset = '2px';
      el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
      el.classList.add('elementfinder-highlighted');
    }
  }
}

/**
 * Removes highlighting from elements.
 */
export function unhighlight(elements) {
  const items = extractElements(elements);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const el = item && item.element ? item.element : item;
    if (el && typeof el === 'object' && 'style' in el) {
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
