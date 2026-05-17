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
  // Handle true() - matches everything
  if (expr === 'true()') return true;
  
  // Handle parentheses by evaluating inner expression
  let innerMatch = expr.match(/^\((.*)\)$/);
  if (innerMatch) {
    return parseXPath(innerMatch[1], el);
  }
  
  // Split by ' or ' for OR conditions (outermost first)
  const orParts = splitByOperator(expr, 'or');
  if (orParts.length > 1) {
    for (const part of orParts) {
      if (parseXPath(part.trim(), el)) {
        return true;
      }
    }
    return false;
  }
  
  // Split by ' and ' for AND conditions
  const andParts = splitByOperator(expr, 'and');
  if (andParts.length > 1) {
    for (const part of andParts) {
      if (!parseXPath(part.trim(), el)) {
        return false;
      }
    }
    return true;
  }
  
  return parseCondition(expr.trim(), el);
}

export function splitByOperator(expr, op) {
  const parts = [];
  let depth = 0;
  let current = '';
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    
    // Check for operator at word boundary
    const remaining = expr.slice(i);
    const opPattern = new RegExp(`^\\s*\\b${op}\\b\\s*`);
    if (depth === 0 && opPattern.test(remaining)) {
      parts.push(current.trim());
      i += remaining.match(opPattern)[0].length - 1;
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function parseCondition(expr, el) {
  // Handle self::tag[@attr='value']
  const selfWithTagMatch = expr.match(/^self::([a-z]+)(\[[^\]]+\])?$/);
  if (selfWithTagMatch) {
    const tagName = selfWithTagMatch[1].toUpperCase();
    if (el.tagName !== tagName) return false;
    // Check for attribute condition in brackets
    if (selfWithTagMatch[2]) {
      const attrExpr = selfWithTagMatch[2].slice(1, -1); // Remove brackets
      return parseXPath(attrExpr, el);
    }
    return true;
  }
  
  // Handle contains(@attr, 'value')
  const containsMatch = expr.match(/contains\(@([a-z-]+),\s*'([^']+)'\)/);
  if (containsMatch) {
    const attr = el.getAttribute(containsMatch[1]) || '';
    return attr.includes(containsMatch[2]);
  }
  
  // Handle @attr='value'
  const attrMatch = expr.match(/@([a-z-]+)='([^']+)'/);
  if (attrMatch) {
    return el.getAttribute(attrMatch[1]) === attrMatch[2];
  }
  
  // Handle @attr (attribute exists)
  const attrExists = expr.match(/^@([a-z-]+)$/);
  if (attrExists) {
    return el.hasAttribute(attrExists[1]);
  }
  
  // Handle descendant::tag
  const descendantMatch = expr.match(/descendant::([a-z]+)/);
  if (descendantMatch) {
    return el.querySelector(descendantMatch[1]) !== null;
  }
  
  // Handle ancestor::*[condition]
  const ancestorMatch = expr.match(/ancestor::\*\[([^\]]+)\]/);
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
export const ELEMENT_DEFINITIONS = elementDefinitionsData;

// Searchable attributes (in priority order)
export let SEARCHABLE_ATTRIBUTES = searchableAttributesData;

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
  if (!value) return true;

  const normalizedValue = value.toLowerCase().trim();

  // Check all searchable attributes
  for (const attr of SEARCHABLE_ATTRIBUTES) {
    const attrValue = el.getAttribute(attr);
    if (attrValue) {
      const normalized = attrValue.toLowerCase().trim();
      if (exact ? normalized === normalizedValue : normalized.includes(normalizedValue)) {
        return true;
      }
    }
  }

  // Check text content
  const textContent = (el.textContent || '').toLowerCase().trim();
  if (exact ? textContent === normalizedValue : textContent.includes(normalizedValue)) {
    return true;
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

export function getAllElements(root = document, frameIndex = 0) {
  const elements = [];
  const walker = document.createTreeWalker(
    root,
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
    elements.push({ element: node, frameIndex });
    
    // Include shadow DOM elements (same frame index)
    if (node.shadowRoot) {
      elements.push(...getAllElements(node.shadowRoot, frameIndex));
    }
    
    // Include iframe elements and their contents
    if (node.tagName === 'IFRAME') {
      try {
        const iframeDoc = node.contentDocument || node.contentWindow?.document;
        if (iframeDoc) {
          elements.push(...getAllElements(iframeDoc, frameIndex + 1));
        }
      } catch {
        // Cross-origin iframe - skip
      }
    }
  }

  return elements;
}

export function findElement(type, text, exact = false, includeHidden = false, parent = null) {
  // Validate type if provided
  if (type && !ELEMENT_DEFINITIONS[type]) {
    console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(', ')}`);
    return { elements: [] };
  }

  const allElements = getAllElements(parent || document);
  const matches = [];

  for (const item of allElements) {
    const el = item.element;
    const elFrameIndex = item.frameIndex;
    
    // Check type match if specified
    if (type && !matchesType(el, type)) continue;

    // Check text/attribute match if specified
    if (text !== undefined && !matchesContent(el, text, exact)) continue;

    // Check visibility
    if (!includeHidden) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' ||
          style.opacity === '0' || el.offsetWidth === 0 || el.offsetHeight === 0) {
        continue;
      }
    }

    matches.push({ element: el, frameIndex: elFrameIndex });
  }

  // Filter to keep only innermost elements (remove ancestors that have matching descendants)
  const innermostMatches = matches.filter(item => {
    return !matches.some(other => {
      // If other is a descendant of el and both match, keep the innermost (other)
      return other !== item && item.element.contains(other.element);
    });
  });

  // Build results with bounding boxes, tag names, and frame index
  // Return objects containing both the element and its metadata
  // This ensures metadata survives the Selenium WebElement serialization
  const qualified = innermostMatches.map(({ element, frameIndex }) => {
    const boundingBox = getBoundingBox(element);
    return {
      element: element,
      boundingBox: boundingBox,
      frameIndex: frameIndex,
      tagName: element.tagName.toLowerCase()
    };
  });

  return { elements: qualified };
}

export function highlight(elements, color = 'red', width = 3) {
  const items = Array.isArray(elements) ? elements : [elements];
  items.forEach(el => {
    el.style.outline = `${width}px solid ${color}`;
    el.style.outlineOffset = '2px';
    el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
    el.classList.add('elementfinder-highlighted');
  });
}

export function unhighlight(elements) {
  const items = Array.isArray(elements) ? elements : [elements];
  items.forEach(el => {
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.boxShadow = '';
    el.classList.remove('elementfinder-highlighted');
  });
}

export function getValidTypes() {
  return Object.keys(ELEMENT_DEFINITIONS);
}