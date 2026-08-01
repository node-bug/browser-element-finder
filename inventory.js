var ElementInventory = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/element-inventory.js
  var element_inventory_exports = {};
  __export(element_inventory_exports, {
    getElementInventory: () => getElementInventory
  });

  // src/element-definitions.json
  var element_definitions_default = {
    link: "self::a or @role='link'",
    navigation: "@role='navigation' or self::nav",
    heading: "@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
    button: "self::button or @role='button' or @type='button' or @type='submit'",
    checkbox: "(self::input and @type='checkbox') or @role='checkbox'",
    switch: "(self::input and @type='checkbox') or @role='switch' or (self::button and (contains(@class, 'switch') or @data-state))",
    slider: "self::input[@type='range'] or @role='slider'",
    datepicker: "self::input[@type='date'] or @role='date'",
    colorpicker: "self::input[@type='color'] or @role='color'",
    radio: "(self::input and @type='radio') or @role='radio'",
    dropdown: "(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])",
    textbox: "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email' or @type='number' or @type='tel' or @type='url')) or @role='textbox'",
    file: "self::input and @type='file'",
    list: "self::ul or self::ol or @role='list'",
    listitem: "self::li or @role='listitem'",
    menu: "self::menu or @role='menu'",
    menuitem: "@role='menuitem'",
    toolbar: "@role='toolbar'",
    dialog: "@role='dialog' or @role='alertdialog'",
    table: "self::table or @role='table'",
    row: "self::tr or @role='row'",
    column: "self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'",
    cell: "self::td or @role='cell' or @role='gridcell'",
    image: "self::img or @role='img' or @alt",
    iframe: "self::iframe",
    element: "true()"
  };

  // src/element-finder.js
  var REGEX_PATTERNS = {
    selfWithTag: /^self::([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/,
    contains: /contains\(@([a-zA-Z0-9-]+),\s*['"]([^'"]+)['"]\)/i,
    attrEquals: /@([a-zA-Z0-9-]+)\s*=\s*['"]([^'"]*)['"]/,
    attrExists: /^@([a-zA-Z0-9-]+)$/,
    descendant: /descendant::([a-zA-Z0-9-]+)/i,
    ancestor: /ancestor::\*\[([^\]]+)\]/i,
    operatorOr: /^\s*\bor\b\s*/i,
    operatorAnd: /^\s*\band\b\s*/i
  };
  var MAX_RECURSION_DEPTH = 100;
  var DEFAULT_IGNORED_TAGS = ["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD", "LINK"];
  var IGNORED_TAGS = new Set(DEFAULT_IGNORED_TAGS);
  var TYPE_MATCHERS = /* @__PURE__ */ new Map();
  for (const [type, expr] of Object.entries(element_definitions_default)) {
    if (expr === "true()") {
      TYPE_MATCHERS.set(type, () => true);
    } else {
      TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el));
    }
  }
  function isIgnoredTag(tagName) {
    return IGNORED_TAGS.has(String(tagName).toUpperCase());
  }
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
  function parseXPath(expr, el, depth = 0) {
    if (expr == null || el == null) return false;
    if (depth > MAX_RECURSION_DEPTH) {
      throw new Error("XPath expression exceeds maximum recursion depth");
    }
    expr = expr.trim();
    if (expr === "true()") return true;
    if (expr[0] === "(" && expr[expr.length - 1] === ")") {
      let parenDepth = 1;
      let matchedAll = true;
      for (let i = 1; i < expr.length - 1; i++) {
        if (expr[i] === "(") parenDepth++;
        else if (expr[i] === ")") parenDepth--;
        if (parenDepth === 0) {
          matchedAll = false;
          break;
        }
      }
      if (matchedAll) return parseXPath(expr.slice(1, -1), el, depth + 1);
    }
    const orParts = splitByOperator(expr, "or");
    if (orParts.length > 1) {
      for (const part of orParts) {
        if (parseXPath(part, el, depth + 1)) return true;
      }
      return false;
    }
    const andParts = splitByOperator(expr, "and");
    if (andParts.length > 1) {
      for (const part of andParts) {
        if (!parseXPath(part, el, depth + 1)) return false;
      }
      return true;
    }
    return parseCondition(expr, el, depth);
  }
  function splitByOperator(expr, op) {
    const parts = [];
    let depth = 0;
    let current = "";
    let inQuotes = false;
    let quoteChar = "";
    const opPattern = op === "or" ? REGEX_PATTERNS.operatorOr : REGEX_PATTERNS.operatorAnd;
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if ((char === "'" || char === '"') && (i === 0 || expr[i - 1] !== "\\")) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        }
      }
      if (!inQuotes) {
        if (char === "(") depth++;
        else if (char === ")") depth--;
        if (depth === 0) {
          const remaining = expr.slice(i);
          const match = remaining.match(opPattern);
          if (match) {
            parts.push(current.trim());
            i += match[0].length - 1;
            current = "";
            continue;
          }
        }
      }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }
  function parseCondition(expr, el, depth = 0) {
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
      const attr = el.getAttribute(containsMatch[1]) || "";
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
  var ELEMENT_DEFINITIONS = Object.freeze(element_definitions_default);
  function matchesType(el, type) {
    if (el == null) return false;
    if (isIgnoredElement(el)) return false;
    const matcher = TYPE_MATCHERS.get(type);
    return matcher ? matcher(el) : false;
  }
  function getAllElements(root = document) {
    const elements = [];
    if (root == null) return elements;
    const rootNode = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
    if (!rootNode) return elements;
    const stack = [rootNode];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (isIgnoredElement(node)) continue;
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
      } catch (e) {
      }
    }
    return elements;
  }
  function getAllFrames(root = window) {
    const frames = [];
    try {
      frames.push({ window: root, document: root.document, isMainFrame: true, frameIndex: -1 });
      const iframes = root.document.querySelectorAll("iframe");
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
          if (e.name === "SecurityError") {
            console.warn("Skipping cross-origin iframe:", e.message);
          } else {
            console.warn("Error accessing iframe:", e.message);
          }
        }
      }
    } catch (e) {
      console.warn("Error getting frames:", e.message);
    }
    return frames;
  }
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
      midy: rect.y + rect.height / 2
    };
  }
  function isHidden(el) {
    if (el == null) return true;
    let parent = el;
    while (parent) {
      if (isElementHidden(parent)) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }
  function inViewport(el, options = null) {
    if (el == null) return false;
    if (typeof el.getBoundingClientRect !== "function") return false;
    if (isHidden(el)) return false;
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch (e) {
      return false;
    }
    if (rect.width === 0 || rect.height === 0) return false;
    const fullyVisible = options != null && options.fullyVisible === true;
    const threshold = options != null && typeof options.threshold === "number" ? Math.max(0, Math.min(1, options.threshold)) : 0;
    let viewportWidth;
    let viewportHeight;
    try {
      if (typeof window !== "undefined" && window.visualViewport) {
        viewportWidth = window.visualViewport.width;
        viewportHeight = window.visualViewport.height;
      } else {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
      }
    } catch (e) {
      return false;
    }
    if (fullyVisible) {
      return rect.left >= 0 && rect.top >= 0 && rect.right <= viewportWidth && rect.bottom <= viewportHeight;
    }
    const intersectionWidth = Math.max(
      0,
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
    );
    const intersectionHeight = Math.max(
      0,
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
    );
    if (intersectionWidth === 0 || intersectionHeight === 0) return false;
    const elementArea = rect.width * rect.height;
    const intersectionArea = intersectionWidth * intersectionHeight;
    const ratio = intersectionArea / elementArea;
    return ratio >= threshold;
  }
  function isElementHidden(el) {
    if (el.hasAttribute("hidden") || el.inert) {
      return true;
    }
    if (typeof el.checkVisibility === "function") {
      const checkVisible = el.checkVisibility({
        checkVisibilityCSS: true
      });
      if (checkVisible) {
        return false;
      }
    }
    try {
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.visibility === "collapse" || style.display === "none") {
        return true;
      }
    } catch (e) {
    }
    if (typeof el.checkVisibility !== "function") {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) {
        return true;
      }
    }
    return false;
  }

  // src/element-inventory.js
  function getVisibleText(el) {
    try {
      const inner = el.innerText;
      if (inner) return inner;
      return el.textContent || "";
    } catch (e) {
      return el.textContent || "";
    }
  }
  function shortenDescriptorText(text) {
    if (!text) return "";
    const firstLine = text.split(/\r?\n/)[0];
    const trimmed = firstLine.trim();
    if (trimmed.length <= 50) return trimmed;
    const trimmed50 = trimmed.substring(0, 50);
    const lastSpace = trimmed50.lastIndexOf(" ");
    if (lastSpace > 0) {
      return trimmed50.substring(0, lastSpace);
    }
    return trimmed50;
  }
  function getNearbyLabelText(el) {
    let labelEl = el.closest("label");
    if (labelEl) {
      return shortenDescriptorText(labelEl.textContent);
    }
    if (el.id) {
      const labelEl2 = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl2) {
        return shortenDescriptorText(labelEl2.textContent);
      }
    }
    return "";
  }
  function getResolvedAriaLabelledByText(el) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (!labelledBy) return "";
    const ids = labelledBy.split(/\s+/);
    let text = "";
    for (const id of ids) {
      const elById = document.getElementById(id);
      if (elById) {
        text += " " + elById.textContent;
      }
    }
    return shortenDescriptorText(text);
  }
  function getIdentifiableText(el) {
    let text = getVisibleText(el);
    text = shortenDescriptorText(text);
    if (text) {
      return { attributeName: "visibleText", identifiableText: text };
    }
    text = getNearbyLabelText(el);
    if (text) {
      return { attributeName: "label", identifiableText: text };
    }
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel !== null && ariaLabel !== "") {
      text = shortenDescriptorText(ariaLabel);
      if (text) {
        return { attributeName: "aria-label", identifiableText: text };
      }
    }
    const ariaLabelledByText = getResolvedAriaLabelledByText(el);
    if (ariaLabelledByText) {
      return { attributeName: "aria-labelledby", identifiableText: ariaLabelledByText };
    }
    const ariaPlaceholder = el.getAttribute("aria-placeholder");
    if (ariaPlaceholder !== null && ariaPlaceholder !== "") {
      text = shortenDescriptorText(ariaPlaceholder);
      if (text) {
        return { attributeName: "aria-placeholder", identifiableText: text };
      }
    }
    const ariaValuetext = el.getAttribute("aria-valuetext");
    if (ariaValuetext !== null && ariaValuetext !== "") {
      text = shortenDescriptorText(ariaValuetext);
      if (text) {
        return { attributeName: "aria-valuetext", identifiableText: text };
      }
    }
    const ariaDescription = el.getAttribute("aria-description");
    if (ariaDescription !== null && ariaDescription !== "") {
      text = shortenDescriptorText(ariaDescription);
      if (text) {
        return { attributeName: "aria-description", identifiableText: text };
      }
    }
    const userFacingAttrs = ["placeholder", "title", "tooltip", "alt"];
    for (const attr of userFacingAttrs) {
      const value = el.getAttribute(attr);
      if (value !== null && value !== "") {
        text = shortenDescriptorText(value);
        if (text) {
          return { attributeName: attr, identifiableText: text };
        }
      }
    }
    const dataAttrs = ["data-value", "data-test-id", "data-testid"];
    for (const attr of dataAttrs) {
      const value = el.getAttribute(attr);
      if (value !== null && value !== "") {
        text = shortenDescriptorText(value);
        if (text) {
          return { attributeName: attr, identifiableText: text };
        }
      }
    }
    const machineAttrs = ["id", "resource-id", "name", "value"];
    for (const attr of machineAttrs) {
      const value = el.getAttribute(attr);
      if (value !== null && value !== "") {
        text = shortenDescriptorText(value);
        if (text) {
          return { attributeName: attr, identifiableText: text };
        }
      }
    }
    return null;
  }
  function getElementInventory(options = {}) {
    const { parent = null } = options;
    const frames = getAllFrames();
    const inventory = [];
    for (const frame of frames) {
      const root = parent && frame.isMainFrame ? parent : frame.document;
      const elements = getAllElements(root);
      for (const el of elements) {
        let type = "element";
        for (const [typeKey] of Object.entries(ELEMENT_DEFINITIONS)) {
          if (typeKey === "element") continue;
          if (matchesType(el, typeKey)) {
            type = typeKey;
            break;
          }
        }
        const box = getBoundingBox(el);
        const hidden = isHidden(el);
        const viewport = inViewport(el, null);
        const identifiableText = getIdentifiableText(el);
        inventory.push({
          type,
          tagName: el.tagName,
          boundingBox: box,
          inViewport: viewport,
          isHidden: hidden,
          frameIndex: frame.frameIndex,
          identifiableText
        });
      }
    }
    return { elements: inventory };
  }
  return __toCommonJS(element_inventory_exports);
})();
