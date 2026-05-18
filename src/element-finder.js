/**
 * Browser Element Finder - Node.js Module Version
 * 
 * This is the canonical source for the element finder library.
 * The build script generates index.js for browser injection.
 */

import searchableAttributesData from './searchable-attributes.json' with { type: 'json' };
import elementDefinitionsData from './element-definitions.json' with { type: 'json' };

// XPath-like expression parser for element type definitions
export function parseXPath(expr, el) {
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

export function splitByOperator(expr, op) {
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

export function parseCondition(expr, el) {
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
export const ELEMENT_DEFINITIONS = Object.freeze(elementDefinitionsData);

// Searchable attributes (in priority order) - internal state
let SEARCHABLE_ATTRIBUTES = searchableAttributesData;

export function setSearchableAttributes(attributes) {
  if (Array.isArray(attributes)) {
    SEARCHABLE_ATTRIBUTES = attributes;
  }
}

export function getSearchableAttributes() {
  return [...SEARCHABLE_ATTRIBUTES];
}

export function matchesType(el, type) {
  const expr = ELEMENT_DEFINITIONS[type];
  return expr ? parseXPath(expr, el) : false;
}

export function matchesContent(el, value, exact = false) {
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

// Handles Shadow DOM traversal
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
    if (node.shadowRoot) {
      elements.push(...getAllElements(node.shadowRoot));
    }
  }
  return elements;
}

// Get all frames/iframes in the window (same-origin only)
export function getAllFrames(root = window) {
  const frames = [];
  try {
    // Add the main window/document as the first "frame" with index -1
    frames.push({ window: root, document: root.document, isMainFrame: true, frameIndex: -1 });
    
    // Get all iframes with 0-based index
    const iframes = root.document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
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
        // Cross-origin iframe - skip
        console.warn('Skipping cross-origin iframe:', e.message);
      }
    }
  } catch (e) {
    console.warn('Error getting frames:', e.message);
  }
  return frames;
}

export function findElement(type = "element", text = null, exact = false, includeHidden = false, parent = null) {
  // Validate type if provided
  if (type && !ELEMENT_DEFINITIONS[type]) {
    console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`);
    return { elements: [] };
  }

  const matches = [];
  const frames = getAllFrames(window);

  for (const frame of frames) {
    const allElements = getAllElements(parent || frame.document);

    for (const el of allElements) {
      // Check type match if specified
      if (type && !matchesType(el, type)) continue;

      // Check text/attribute match if specified
      if (text !== undefined && !matchesContent(el, text, exact)) continue;

      // Check visibility
      if (!includeHidden) {
        const elWindow = el.ownerDocument?.defaultView || frame.window;
        const style = elWindow.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' ||
            style.opacity === '0' || el.offsetWidth === 0 || el.offsetHeight === 0) {
          continue;
        }
      }

      matches.push({ element: el, frame: frame });
    }
  }

  // Filter to keep only innermost elements (remove ancestors that have matching descendants)
  const innermostMatches = matches.filter(item => {
    return !matches.some(other => {
      // If other is a descendant of el and both match, keep the innermost (other)
      return other !== item && item.element.contains(other.element);
    });
  });

  // Build results with bounding boxes and tag names
  // For iframe elements, we need to serialize the element data since DOM elements
  // from different frames cannot be passed across frame boundaries
  const qualified = innermostMatches.map(item => {
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

// FIXED: Gracefully accepts raw objects, raw nodes, or API results wrapper payloads
export function highlight(elements, color = 'red', width = 3) {
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

export function unhighlight(elements) {
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

export function getValidTypes() {
  return Object.keys(ELEMENT_DEFINITIONS);
}