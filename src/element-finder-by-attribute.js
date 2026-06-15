/**
 * Element Finder By Attribute - Standalone Module
 *
 * This module provides functionality to find elements by their searchable attributes.
 * It is a separate implementation from the main element-finder.js.
 */

import searchableAttributesData from './searchable-attributes.json' with { type: 'json' };

const DEFAULT_IGNORED_TAGS = ['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'];

let IGNORED_TAGS = new Set(DEFAULT_IGNORED_TAGS);

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
 * Normalizes a tag list for ignored tag configuration.
 * @param {string[]} tags - Array of tag names
 * @returns {string[]} Normalized uppercase tag names
 * @throws {TypeError} If tags is not an array
 */
function normalizeTagList(tags) {
  if (!Array.isArray(tags)) {
    throw new TypeError('tags must be an array');
  }

  const normalizedTags = [];
  for (let i = 0; i < tags.length; i++) {
    if (typeof tags[i] === 'string' && tags[i].trim() !== '') {
      normalizedTags.push(tags[i].toUpperCase());
    }
  }
  return normalizedTags;
}

/**
 * Sets custom tags to ignore during traversal.
 * Tag names are case-insensitive. Passing an empty array clears ignored tags.
 * @param {string[]} tags - Array of tag names to ignore
 * @throws {TypeError} If tags is not an array
 */
export function setIgnoredTags(tags) {
  IGNORED_TAGS = new Set(normalizeTagList(tags));
}

/**
 * Gets the current ignored tags array.
 * @returns {string[]} Copy of the current ignored tags array
 */
export function getIgnoredTags() {
  return [...IGNORED_TAGS].sort();
}

/**
 * Adds tags to the ignored tag list.
 * @param {string[]} tags - Array of tag names to ignore
 * @throws {TypeError} If tags is not an array
 */
export function addIgnoredTags(tags) {
  const normalizedTags = normalizeTagList(tags);
  for (let i = 0; i < normalizedTags.length; i++) {
    IGNORED_TAGS.add(normalizedTags[i]);
  }
}

/**
 * Removes tags from the ignored tag list.
 * @param {string[]} tags - Array of tag names to allow
 * @throws {TypeError} If tags is not an array
 */
export function removeIgnoredTags(tags) {
  const normalizedTags = normalizeTagList(tags);
  for (let i = 0; i < normalizedTags.length; i++) {
    IGNORED_TAGS.delete(normalizedTags[i]);
  }
}

/**
 * Checks if a tag name is configured to be ignored.
 * @param {string} tagName - The tag name to check
 * @returns {boolean} True if the tag name is ignored
 */
function isIgnoredTag(tagName) {
  return IGNORED_TAGS.has(String(tagName).toUpperCase());
}

/**
 * Checks if an element's tag should be ignored during traversal.
 * Also returns true for descendants of ignored tags so direct matcher calls are consistent.
 * @param {Element} el - The DOM element to check
 * @returns {boolean} True if the element or one of its ancestors is ignored
 */
function isIgnoredElement(el) {
  let current = el;
  while (current) {
    if (isIgnoredTag(current.tagName)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * Gets text content while excluding ignored tags and their descendants.
 * This intentionally stays within the element's light DOM children; shadow DOM
 * descendants are discovered separately by getAllElements().
 * @param {Element} el - The DOM element to inspect
 * @returns {string} Text content excluding ignored subtrees
 */
function getSearchableTextContent(el) {
  if (el == null || isIgnoredElement(el)) return '';

  let text = '';
  const stack = [el];

  while (stack.length > 0) {
    const node = stack.pop();

    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE || isIgnoredElement(node)) {
      continue;
    }

    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return text;
}

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
 * Checks if an element matches the specified attribute value.
 * Searches through all searchable attributes in priority order, then text content.
 * Text matching is case-sensitive. Ignores elements whose tag is configured as ignored.
 * @param {Element} el - The DOM element to check
 * @param {string} value - The attribute value to search for
 * @param {boolean} [exact=false] - Whether to match exactly or as substring
 * @returns {boolean} True if the element has a matching attribute value or text content
 */
export function matchesAttribute(el, value, exact = false) {
  if (el == null) return false;
  if (value === undefined || value === null || value === '') return true;

  // Skip elements whose tag is configured to be ignored
  if (isIgnoredElement(el)) return false;

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
  const textContent = getSearchableTextContent(el);
  if (exact ? textContent.trim() === value : textContent.includes(value)) {
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
  if (root == null) return elements;
  const rootNode = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
  if (!rootNode) return elements;

  const stack = [rootNode];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (IGNORED_TAGS.has(node.tagName)) continue;

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
      if (exact ? attrValue === value : attrValue.includes(value)) {
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
 * Returns an array of all valid searchable attribute names.
 */
export function getValidAttributes() {
  return [...SEARCHABLE_ATTRIBUTES];
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
 * @param {Array|Object} elements - Elements to highlight (from findElementsByAttribute result or array)
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
 * @param {Array|Object} elements - Elements to unhighlight (from findElementsByAttribute result or array)
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