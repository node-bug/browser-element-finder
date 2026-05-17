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
  
  function splitByOperator(expr, op) {
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
  
  function parseCondition(expr, el) {
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
  const ELEMENT_DEFINITIONS = {
    // Navigation & Structure
    link: `self::a or @role='link' or @href`,
    navigation: `@role='navigation' or self::nav`,
    heading: `@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6`,

    // Interactive Controls
    button: `self::button or @role='button' or @type='button' or @type='submit'`,
    checkbox: `(self::input and @type='checkbox') or @role='checkbox'`,
    switch: `self::button[@role='switch'] or (self::input and @type='checkbox') or @role='switch' or (self::button and @data-state)`,
    slider: `self::input[@type='range'] or @role='slider'`,
    radio: `(self::input and @type='radio') or @role='radio'`,
    
    // Dropdown: native <select> and custom combobox widgets
    dropdown: `(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])`,

    // Forms & Inputs
    textbox: `self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email')) or @role='textbox'`,
    file: `self::input and @type='file'`,

    // Lists & Menus
    list: `self::ul or self::ol or @role='list'`,
    listitem: `self::li or @role='listitem'`,
    menu: `self::menu or @role='menu'`,
    menuitem: `@role='menuitem'`,

    // Containers & Layout
    toolbar: `@role='toolbar'`,
    dialog: `@role='dialog'`,

    // Tables / Grids
    table: `self::table or @role='table'`,
    row: `self::tr or @role='row'`,
    column: `self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'`,

    // Media
    image: `self::img or @role='img' or @alt`,

    // Global Fallback
    element: `true()`
  };

  // Searchable attributes (in priority order)
  let SEARCHABLE_ATTRIBUTES = [
    'placeholder', 'value', 'data-test-id', 'data-testid', 'id',
    'resource-id', 'name', 'aria-label', 'class', 'hint',
    'title', 'tooltip', 'alt', 'src', 'aria-labelledby'
  ];

  /**
   * Sets custom searchable attributes.
   * @param {string[]} attributes - Array of attribute names to search
   */
  function setSearchableAttributes(attributes) {
    if (Array.isArray(attributes)) {
      SEARCHABLE_ATTRIBUTES = attributes;
    }
  }

  /**
   * Gets the current searchable attributes.
   * @returns {string[]} Array of searchable attribute names
   */
  function getSearchableAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
  }

  /**
   * Checks if an element matches a type constraint.
   * @param {Element} el - DOM element
   * @param {string} type - Element type name
   * @returns {boolean} True if element matches type
   */
  function matchesType(el, type) {
    const expr = ELEMENT_DEFINITIONS[type];
    return expr ? parseXPath(expr, el) : false;
  }

  /**
   * Checks if an element matches text/attribute content.
   * @param {Element} el - DOM element
   * @param {string} value - Text to search for
   * @param {boolean} exact - Exact match vs substring
   * @returns {boolean} True if element matches content
   */
  function matchesContent(el, value, exact = false) {
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

  /**
   * Gets bounding box for an element.
   * @param {Element} el - DOM element
   * @returns {Object} Bounding box with position and dimensions
   */
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

  /**
   * Recursively collects all elements from shadow DOM roots and iframes.
   * @param {Element|Document} root - Root element to search
   * @param {number} frameIndex - Index of the frame (0 = main document)
   * @returns {Object[]} Array of objects with element and frameIndex
   */
  function getAllElements(root = document, frameIndex = 0) {
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

  /**
   * Finds elements by type and/or text content.
   * @param {string} [type] - Element type (button, textbox, link, etc.)
   * @param {string} [text] - Text to search for in content/attributes
   * @param {boolean} [exact=false] - Exact text match
   * @param {boolean} [includeHidden=false] - Include hidden elements
   * @param {Element} [parent] - Parent element to search within (optional)
   * @returns {Object} Results with elements and their bounding boxes
   */
  function findElement(type, text, exact = false, includeHidden = false, parent = null) {
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
    const elements = innermostMatches.map(item => ({
      element: item.element,
      boundingBox: getBoundingBox(item.element),
      tagName: item.element.tagName.toLowerCase(),
      frameIndex: item.frameIndex
    }));

    return { elements };
  }

  /**
   * Highlights matching elements on the page with a thick bounding box.
   * @param {Element[]|Object[]} elements - Elements to highlight (can be raw elements or result objects)
   * @param {string} [color='red'] - Outline color
   * @param {number} [width=3] - Outline width (thick by default)
   */
  function highlight(elements, color = 'red', width = 3) {
    elements.forEach(item => {
      const el = item.element || item;
      el.style.outline = `${width}px solid ${color}`;
      el.style.outlineOffset = '2px';
      el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
      el.classList.add('elementfinder-highlighted');
    });
  }

  /**
   * Removes highlighting from elements.
   * @param {Element[]|Object[]} elements - Elements to unhighlight (can be raw elements or result objects)
   */
  function unhighlight(elements) {
    elements.forEach(item => {
      const el = item.element || item;
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
      el.classList.remove('elementfinder-highlighted');
    });
  }

  /**
   * Gets all valid element type names.
   * @returns {string[]} Array of valid type names
   */
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
    getSearchableAttributes
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementFinder;
}