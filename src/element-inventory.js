/**
 * Element Inventory - Generate a serializable inventory of DOM elements.
 * This file contains the main function for generating element inventories
 * by reusing existing helper functions from the finder module.
 */

import {
  getAllFrames,
  getAllElements,
  matchesType,
  getBoundingBox,
  isHidden,
  inViewport as checkInViewport,
  ELEMENT_DEFINITIONS
} from './element-finder.js';

/**
 * Get all visible descendant text from an element.
 * Uses innerText to capture text from nested children while respecting CSS visibility
 * (hidden elements, collapsed whitespace). Falls back to textContent for environments
 * where innerText is not fully supported (e.g., jsdom). Wraps in try/catch for edge cases.
 * @param {Element} el
 * @returns {string}
 */
function getVisibleText(el) {
  try {
    const inner = el.innerText;
    // innerText may be empty in jsdom even when textContent has content
    if (inner) return inner;
    // Fallback to textContent for test environments or edge cases
    return el.textContent || '';
  } catch {
    // Fallback to textContent if innerText throws (e.g., in some iframe contexts)
    return el.textContent || '';
  }
}

/**
 * Shorten descriptor text to first non-empty line, max 50 chars, breaking at word boundary.
 * @param {string} text
 * @returns {string}
 */
function shortenDescriptorText(text) {
  if (!text) return '';
  const firstLine = text.split(/\r?\n/)[0];
  const trimmed = firstLine.trim();
  if (trimmed.length <= 50) return trimmed;
  const trimmed50 = trimmed.substring(0, 50);
  const lastSpace = trimmed50.lastIndexOf(' ');
  if (lastSpace > 0) {
    return trimmed50.substring(0, lastSpace);
  }
  return trimmed50;
}

/**
 * Get nearby label text for an element (wrapping <label> or <label for="id">).
 * @param {Element} el
 * @returns {string}
 */
function getNearbyLabelText(el) {
  let labelEl = el.closest('label');
  if (labelEl) {
    return shortenDescriptorText(labelEl.textContent);
  }
  if (el.id) {
    const labelEl = document.querySelector(`label[for="${el.id}"]`);
    if (labelEl) {
      return shortenDescriptorText(labelEl.textContent);
    }
  }
  return '';
}

/**
 * Get resolved text from aria-labelledby attribute.
 * @param {Element} el
 * @returns {string}
 */
function getResolvedAriaLabelledByText(el) {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (!labelledBy) return '';
  const ids = labelledBy.split(/\s+/);
  let text = '';
  for (const id of ids) {
    const elById = document.getElementById(id);
    if (elById) {
      text += ' ' + elById.textContent;
    }
  }
  return shortenDescriptorText(text);
}

/**
 * Get identifiable text for an element using a priority hierarchy.
 * @param {Element} el
 * @returns {{attributeName: string, identifiableText: string}|null}
 */
function getIdentifiableText(el) {
  // 1. Visible text (all descendant text, respecting CSS visibility)
  let text = getVisibleText(el);
  text = shortenDescriptorText(text);
  if (text) {
    return { attributeName: 'visibleText', identifiableText: text };
  }

  // 2. Nearby label
  text = getNearbyLabelText(el);
  if (text) {
    return { attributeName: 'label', identifiableText: text };
  }

  // 3. ARIA attributes
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel !== null && ariaLabel !== '') {
    text = shortenDescriptorText(ariaLabel);
    if (text) {
      return { attributeName: 'aria-label', identifiableText: text };
    }
  }

  const ariaLabelledByText = getResolvedAriaLabelledByText(el);
  if (ariaLabelledByText) {
    return { attributeName: 'aria-labelledby', identifiableText: ariaLabelledByText };
  }

  const ariaPlaceholder = el.getAttribute('aria-placeholder');
  if (ariaPlaceholder !== null && ariaPlaceholder !== '') {
    text = shortenDescriptorText(ariaPlaceholder);
    if (text) {
      return { attributeName: 'aria-placeholder', identifiableText: text };
    }
  }

  const ariaValuetext = el.getAttribute('aria-valuetext');
  if (ariaValuetext !== null && ariaValuetext !== '') {
    text = shortenDescriptorText(ariaValuetext);
    if (text) {
      return { attributeName: 'aria-valuetext', identifiableText: text };
    }
  }

  const ariaDescription = el.getAttribute('aria-description');
  if (ariaDescription !== null && ariaDescription !== '') {
    text = shortenDescriptorText(ariaDescription);
    if (text) {
      return { attributeName: 'aria-description', identifiableText: text };
    }
  }

  // 4. User-facing attributes (placeholder, title, tooltip, alt)
  const userFacingAttrs = ['placeholder', 'title', 'tooltip', 'alt'];
  for (const attr of userFacingAttrs) {
    const value = el.getAttribute(attr);
    if (value !== null && value !== '') {
      text = shortenDescriptorText(value);
      if (text) {
        return { attributeName: attr, identifiableText: text };
      }
    }
  }

  // 5. Data attributes (data-value, data-test-id, data-testid)
  const dataAttrs = ['data-value', 'data-test-id', 'data-testid'];
  for (const attr of dataAttrs) {
    const value = el.getAttribute(attr);
    if (value !== null && value !== '') {
      text = shortenDescriptorText(value);
      if (text) {
        return { attributeName: attr, identifiableText: text };
      }
    }
  }

  // 6. Machine attributes (id, resource-id, name, value)
  const machineAttrs = ['id', 'resource-id', 'name', 'value'];
  for (const attr of machineAttrs) {
    const value = el.getAttribute(attr);
    if (value !== null && value !== '') {
      text = shortenDescriptorText(value);
      if (text) {
        return { attributeName: attr, identifiableText: text };
      }
    }
  }

  return null;
}

/**
 * Generate a flat, JSON-serializable array of DOM element metadata.
 * Iterates frames/elements and collects metadata including semantic type,
 * bounding box, visibility, viewport status, and identifiable text.
 * @param {Object} [options={}]
 * @param {Element|ShadowRoot|null} [options.parent=null] - Scope traversal to a subtree
 * @param {boolean} [options.inViewport=false] - When true, filter to viewport-only elements and add per-type indexing
 * @returns {{elements: Array<{
 *   type: string,
 *   tagName: string,
 *   boundingBox: {x: number, y: number, width: number, height: number, top: number, bottom: number, left: number, right: number, midx: number, midy: number},
 *   inViewport: boolean,
 *   isHidden: boolean,
 *   frameIndex: number,
 *   identifiableText: {attributeName: string, identifiableText: string}|null,
 *   index?: number
 * }>}}
 */
export function getElementInventory({ parent = null, inViewport = false } = {}) {
  const frames = getAllFrames();
  const inventory = [];

  for (const frame of frames) {
    const root = parent && frame.isMainFrame ? parent : frame.document;
    const elements = getAllElements(root);

    for (const el of elements) {
      // Determine semantic type
      let type = 'element';
      for (const [typeKey] of Object.entries(ELEMENT_DEFINITIONS)) {
        if (typeKey === 'element') continue;
        if (matchesType(el, typeKey)) {
          type = typeKey;
          break;
        }
      }

      const box = getBoundingBox(el);
      const hidden = isHidden(el);
      const viewport = checkInViewport(el);

      // Filter: on-screen mode skips non-viewport elements
      if (inViewport && !viewport) continue;

      inventory.push({
        type,
        tagName: el.tagName,
        boundingBox: box,
        inViewport: viewport,
        isHidden: hidden,
        frameIndex: frame.frameIndex,
        identifiableText: getIdentifiableText(el)
      });
    }
  }

  // On-screen mode: group by type, sort by vertical position, assign 0-based index
  if (inViewport) {
    const typeGroups = new Map();
    for (const el of inventory) {
      if (!typeGroups.has(el.type)) {
        typeGroups.set(el.type, []);
      }
      typeGroups.get(el.type).push(el);
    }

    for (const [, elements] of typeGroups) {
      elements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      for (let i = 0; i < elements.length; i++) {
        elements[i].index = i;
      }
    }

    const result = [];
    for (const [, elements] of typeGroups) {
      result.push(...elements);
    }

    return { elements: result };
  }

  return { elements: inventory };
}




