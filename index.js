var ElementFinder = (() => {
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

  // src/element-finder.js
  var element_finder_exports = {};
  __export(element_finder_exports, {
    ELEMENT_DEFINITIONS: () => ELEMENT_DEFINITIONS,
    findElementByAttributes: () => findElementByAttributes,
    findElementByType: () => findElementByType,
    findElements: () => findElements,
    findProbableElements: () => findProbableElements,
    getAllElements: () => getAllElements,
    getAllFrames: () => getAllFrames,
    getBoundingBox: () => getBoundingBox,
    getSearchableAttributes: () => getSearchableAttributes,
    getValidAttributes: () => getValidAttributes,
    getValidTypes: () => getValidTypes,
    highlight: () => highlight,
    matchesAttribute: () => matchesAttribute,
    matchesType: () => matchesType,
    parseCondition: () => parseCondition,
    parseXPath: () => parseXPath,
    setSearchableAttributes: () => setSearchableAttributes,
    splitByOperator: () => splitByOperator,
    unhighlight: () => unhighlight
  });

  // src/element-definitions.json
  var element_definitions_default = {
    link: "self::a or @role='link' or @href",
    navigation: "@role='navigation' or self::nav",
    heading: "@role='heading' or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
    button: "self::button or @role='button' or @type='button' or @type='submit'",
    checkbox: "(self::input and @type='checkbox') or @role='checkbox'",
    switch: "(self::input and @type='checkbox') or @role='switch' or (self::button and (contains(@class, 'switch') or @data-state))",
    slider: "self::input[@type='range'] or @role='slider'",
    radio: "(self::input and @type='radio') or @role='radio'",
    dropdown: "(self::select[descendant::option] or @role='combobox' or @role='listbox' or contains(@class, 'dropdown') or contains(@class, 'trigger') or ancestor::*[contains(@class, 'dropdown') or @role='combobox'])",
    textbox: "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email' or @type='number' or @type='tel' or @type='url')) or @role='textbox'",
    file: "self::input and @type='file'",
    list: "self::ul or self::ol or @role='list'",
    listitem: "self::li or @role='listitem'",
    menu: "self::menu or @role='menu'",
    menuitem: "@role='menuitem'",
    toolbar: "@role='toolbar'",
    dialog: "@role='dialog'",
    table: "self::table or @role='table'",
    row: "self::tr or @role='row'",
    column: "self::td or self::th or @role='cell' or @role='gridcell' or @role='columnheader'",
    cell: "self::td or @role='cell' or @role='gridcell'",
    image: "self::img or @role='img' or @alt",
    element: "true()"
  };

  // src/searchable-attributes.json
  var searchable_attributes_default = [
    "placeholder",
    "value",
    "data-test-id",
    "data-testid",
    "id",
    "resource-id",
    "name",
    "aria-label",
    "hint",
    "title",
    "tooltip",
    "alt",
    "src",
    "aria-labelledby"
  ];

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
  var TYPE_MATCHERS = /* @__PURE__ */ new Map();
  for (const [type, expr] of Object.entries(element_definitions_default)) {
    if (expr === "true()") {
      TYPE_MATCHERS.set(type, () => true);
    } else {
      TYPE_MATCHERS.set(type, (el) => parseXPath(expr, el));
    }
  }
  var SEARCHABLE_ATTRIBUTES = searchable_attributes_default;
  function setSearchableAttributes(attributes) {
    if (!Array.isArray(attributes)) {
      throw new TypeError("attributes must be an array");
    }
    SEARCHABLE_ATTRIBUTES = attributes;
  }
  function getSearchableAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
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
  function getDirectText(el) {
    let text = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }
  function isInsideStyleOrScript(el) {
    if (el.tagName === "STYLE" || el.tagName === "SCRIPT") {
      return true;
    }
    if (el.querySelector("STYLE, SCRIPT")) {
      return true;
    }
    let parent = el.parentElement;
    while (parent) {
      if (parent.tagName === "STYLE" || parent.tagName === "SCRIPT") {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }
  function matchesAttribute(el, value, exact = false) {
    if (el == null) return false;
    if (value === void 0 || value === null || value === "") return true;
    if (isInsideStyleOrScript(el)) return false;
    const attrs = SEARCHABLE_ATTRIBUTES;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      let attrValue;
      try {
        attrValue = el.getAttribute(attr);
      } catch (e) {
        continue;
      }
      if (attrValue) {
        if (exact ? attrValue === value : attrValue.includes(value)) {
          return true;
        }
      }
    }
    const directText = getDirectText(el);
    if (exact ? directText === value : directText.includes(value)) {
      return true;
    }
    const textContent = el.textContent;
    if (exact ? textContent.trim() === value : textContent.includes(value)) {
      return true;
    }
    return false;
  }
  function matchesType(el, type) {
    if (el == null) return false;
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
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE") continue;
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
      midy: rect.y + rect.height / 2,
      tagName: el.tagName.toLowerCase()
    };
  }
  function findElementByType(type = "element", parent = null) {
    if (type === null || type === void 0) {
      type = "element";
    }
    if (typeof type !== "string") {
      throw new TypeError(`type must be a string, got ${typeof type}`);
    }
    if (type && !ELEMENT_DEFINITIONS[type]) {
      console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
      return { elements: [] };
    }
    const matches = [];
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (type && !matchesType(el, type)) continue;
        matches.push({ element: el, frame });
      }
    }
    const innermostMatches = [];
    if (matches.length > 0) {
      const matchedElements = new Set(matches.map((m) => m.element));
      const excludedElements = /* @__PURE__ */ new Set();
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
    const qualified = innermostMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex
      };
    });
    return { elements: qualified };
  }
  function findElementByAttributes(value, exact = false, parent = null) {
    if (value === null || value === void 0) {
      value = "";
    }
    if (typeof value !== "string") {
      throw new TypeError(`value must be a string, got ${typeof value}`);
    }
    const matches = [];
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (!matchesAttribute(el, value, exact)) continue;
        matches.push({ element: el, frame });
      }
    }
    const innermostMatches = [];
    if (matches.length > 0) {
      const matchedElements = new Set(matches.map((m) => m.element));
      const excludedElements = /* @__PURE__ */ new Set();
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
    const qualified = innermostMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex
      };
    });
    return { elements: qualified };
  }
  function findElements(type = null, text = null, exact = false, parent = null) {
    if (text === null || text === void 0) {
      text = "";
    }
    if (type !== null && type !== void 0) {
      if (typeof type !== "string") {
        throw new TypeError(`type must be a string, got ${typeof type}`);
      }
      if (!ELEMENT_DEFINITIONS[type]) {
        console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
        return { elements: [] };
      }
    }
    if (text !== "" && typeof text !== "string") {
      throw new TypeError(`text must be a string, got ${typeof text}`);
    }
    const matches = [];
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (type !== null && type !== void 0 && !matchesType(el, type)) continue;
        if (text !== "" && !matchesAttribute(el, text, exact)) continue;
        matches.push({ element: el, frame });
      }
    }
    const innermostMatches = [];
    if (matches.length > 0) {
      const matchedElements = new Set(matches.map((m) => m.element));
      const excludedElements = /* @__PURE__ */ new Set();
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
    const qualified = innermostMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex
      };
    });
    return { elements: qualified };
  }
  function findNearbyElementType(el, targetType) {
    let parent = el.parentElement;
    while (parent) {
      if (matchesType(parent, targetType)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    const allElements = getAllElements(el);
    for (const child of allElements) {
      if (matchesType(child, targetType)) {
        return child;
      }
    }
    const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
    for (const sibling of siblings) {
      if (sibling !== el && matchesType(sibling, targetType)) {
        return sibling;
      }
    }
    return null;
  }
  function findProbableElements(elementType, attributeText, exact = false, parent = null) {
    if (typeof elementType !== "string") {
      throw new TypeError(`elementType must be a string, got ${typeof elementType}`);
    }
    if (!ELEMENT_DEFINITIONS[elementType]) {
      console.warn(`Unknown element type: ${elementType}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
      return { elements: [] };
    }
    if (typeof attributeText !== "string") {
      throw new TypeError(`attributeText must be a string, got ${typeof attributeText}`);
    }
    const matches = [];
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (!matchesType(el, elementType)) continue;
        if (!matchesAttribute(el, attributeText, exact)) continue;
        matches.push({ element: el, frame });
      }
    }
    if (matches.length === 0) {
      const attributeMatches = [];
      for (const frame of frames) {
        const allElements = getAllElements(parent || frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (matchesAttribute(el, attributeText, exact)) {
            attributeMatches.push({ element: el, frame });
          }
        }
      }
      for (const match of attributeMatches) {
        const nearbyElement = findNearbyElementType(match.element, elementType);
        if (nearbyElement) {
          matches.push({ element: nearbyElement, frame: match.frame });
        }
      }
    }
    const innermostMatches = [];
    if (matches.length > 0) {
      const matchedElements = new Set(matches.map((m) => m.element));
      const excludedElements = /* @__PURE__ */ new Set();
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
    const qualified = innermostMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex
      };
    });
    return { elements: qualified };
  }
  function extractElements(elements) {
    if (!elements) return [];
    if (elements && elements.elements && Array.isArray(elements.elements)) {
      return elements.elements;
    }
    return Array.isArray(elements) ? elements : [elements];
  }
  function highlight(elements, color = "red", width = 3) {
    const items = extractElements(elements);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const el = item.element ? item.element : item;
      if (el && el.style) {
        el.style.outline = `${width}px solid ${color}`;
        el.style.outlineOffset = "2px";
        el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
        el.classList.add("elementfinder-highlighted");
      }
    }
  }
  function unhighlight(elements) {
    const items = extractElements(elements);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const el = item.element ? item.element : item;
      if (el && el.style) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.boxShadow = "";
        el.classList.remove("elementfinder-highlighted");
      }
    }
  }
  function getValidTypes() {
    return Object.keys(ELEMENT_DEFINITIONS);
  }
  function getValidAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
  }
  return __toCommonJS(element_finder_exports);
})();
