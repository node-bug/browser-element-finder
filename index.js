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
    findElement: () => findElement,
    getAllElements: () => getAllElements,
    getAllFrames: () => getAllFrames,
    getBoundingBox: () => getBoundingBox,
    getSearchableAttributes: () => getSearchableAttributes,
    getValidTypes: () => getValidTypes,
    highlight: () => highlight,
    matchesContent: () => matchesContent,
    matchesType: () => matchesType,
    parseCondition: () => parseCondition,
    parseXPath: () => parseXPath,
    setSearchableAttributes: () => setSearchableAttributes,
    splitByOperator: () => splitByOperator,
    unhighlight: () => unhighlight
  });

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
    "class",
    "hint",
    "title",
    "tooltip",
    "alt",
    "src",
    "aria-labelledby"
  ];

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
    textbox: "self::textarea or (self::input and (@type='text' or @type='password' or @type='search' or @type='email')) or @role='textbox'",
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
    image: "self::img or @role='img' or @alt",
    element: "true()"
  };

  // src/element-finder.js
  var REGEX_PATTERNS = {
    selfWithTag: /^self::([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/,
    contains: /contains\(@([a-zA-Z0-9-]+),\s*['"]([^'"]+)['"]\)/i,
    attrEquals: /@([a-zA-Z0-9-]+)\s*=\s*['"]([^'"]+)['"]/,
    attrExists: /^@([a-zA-Z0-9-]+)$/,
    descendant: /descendant::([a-zA-Z0-9-]+)/i,
    ancestor: /ancestor::\*\[([^\]]+)\]/i,
    operatorOr: /^\s*\bor\b\s*/i,
    operatorAnd: /^\s*\band\b\s*/i
  };
  function parseXPath(expr, el) {
    expr = expr.trim();
    if (expr === "true()") return true;
    if (expr.startsWith("(") && expr.endsWith(")")) {
      let depth = 0;
      let matchedAll = true;
      for (let i = 0; i < expr.length; i++) {
        if (expr[i] === "(") depth++;
        else if (expr[i] === ")") depth--;
        if (depth === 0 && i < expr.length - 1) {
          matchedAll = false;
          break;
        }
      }
      if (matchedAll) {
        return parseXPath(expr.slice(1, -1), el);
      }
    }
    const orParts = splitByOperator(expr, "or");
    if (orParts.length > 1) {
      for (const part of orParts) {
        if (parseXPath(part, el)) return true;
      }
      return false;
    }
    const andParts = splitByOperator(expr, "and");
    if (andParts.length > 1) {
      for (const part of andParts) {
        if (!parseXPath(part, el)) return false;
      }
      return true;
    }
    return parseCondition(expr, el);
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
  function parseCondition(expr, el) {
    expr = expr.trim();
    let match = expr.match(REGEX_PATTERNS.selfWithTag);
    if (match) {
      const tagName = match[1].toUpperCase();
      if (el.tagName !== tagName) return false;
      if (match[2]) {
        return parseXPath(match[2], el);
      }
      return true;
    }
    match = expr.match(REGEX_PATTERNS.contains);
    if (match) {
      const attr = el.getAttribute(match[1]) || "";
      return attr.toLowerCase().includes(match[2].toLowerCase());
    }
    match = expr.match(REGEX_PATTERNS.attrEquals);
    if (match) {
      return el.getAttribute(match[1]) === match[2];
    }
    match = expr.match(REGEX_PATTERNS.attrExists);
    if (match) {
      return el.hasAttribute(match[1]);
    }
    match = expr.match(REGEX_PATTERNS.descendant);
    if (match) {
      return el.querySelector(match[1]) !== null;
    }
    match = expr.match(REGEX_PATTERNS.ancestor);
    if (match) {
      let parent = el.parentElement;
      while (parent) {
        if (parseXPath(match[1], parent)) return true;
        parent = parent.parentElement;
      }
      return false;
    }
    return false;
  }
  var ELEMENT_DEFINITIONS = Object.freeze(element_definitions_default);
  var SEARCHABLE_ATTRIBUTES = searchable_attributes_default;
  function setSearchableAttributes(attributes) {
    if (Array.isArray(attributes)) {
      SEARCHABLE_ATTRIBUTES = attributes;
    }
  }
  function getSearchableAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
  }
  function matchesType(el, type) {
    const expr = ELEMENT_DEFINITIONS[type];
    return expr ? parseXPath(expr, el) : false;
  }
  function matchesContent(el, value, exact = false) {
    if (value === void 0 || value === null || value === "") return true;
    const normalizedValue = value.toLowerCase().trim();
    for (const attr of SEARCHABLE_ATTRIBUTES) {
      const attrValue = el.getAttribute(attr);
      if (attrValue) {
        const normalized = attrValue.toLowerCase().trim();
        if (exact ? normalized === normalizedValue : normalized.includes(normalizedValue)) {
          return true;
        }
      }
    }
    const directText = Array.from(el.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("").toLowerCase().trim();
    if (exact ? directText === normalizedValue : directText.includes(normalizedValue)) {
      return true;
    }
    if (el.tagName === "SELECT") {
      const options = el.querySelectorAll("option");
      for (const option of options) {
        const optionText = option.textContent.toLowerCase().trim();
        if (exact ? optionText === normalizedValue : optionText.includes(normalizedValue)) {
          return true;
        }
      }
    }
    return false;
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
  function getAllElements(root = document) {
    const elements = [];
    const rootNode = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
    if (!rootNode) return elements;
    const walker = (rootNode.ownerDocument || rootNode).createTreeWalker(
      rootNode,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node2) => {
          if (node2.tagName === "SCRIPT" || node2.tagName === "STYLE") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) {
      elements.push(node);
      if (node.shadowRoot) {
        elements.push(...getAllElements(node.shadowRoot));
      }
    }
    return elements;
  }
  function getAllFrames(root = window, maxFrames = Infinity) {
    const frames = [];
    try {
      frames.push({ window: root, document: root.document, isMainFrame: true, frameIndex: -1 });
      const iframes = root.document.querySelectorAll("iframe");
      for (let i = 0; i < iframes.length && frames.length < maxFrames; i++) {
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
          console.warn("Skipping cross-origin iframe:", e.message);
        }
      }
    } catch (e) {
      console.warn("Error getting frames:", e.message);
    }
    return frames;
  }
  function findElement(type = "element", text = null, exact = false, includeHidden = false, parent = null, maxFrames = Infinity) {
    var _a;
    if (type && !ELEMENT_DEFINITIONS[type]) {
      console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
      return { elements: [] };
    }
    const matches = [];
    const frames = getAllFrames(window, maxFrames);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (const el of allElements) {
        if (type && !matchesType(el, type)) continue;
        if (text !== void 0 && !matchesContent(el, text, exact)) continue;
        if (!includeHidden) {
          const elWindow = ((_a = el.ownerDocument) == null ? void 0 : _a.defaultView) || frame.window;
          const style = elWindow.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            continue;
          }
          if (el.offsetWidth === 0 || el.offsetHeight === 0) {
            continue;
          }
        }
        matches.push({ element: el, frame });
      }
    }
    const innermostMatches = [];
    for (let i = 0; i < matches.length; i++) {
      let isAncestorOfOther = false;
      for (let j = 0; j < matches.length; j++) {
        if (i !== j && matches[i].element.contains(matches[j].element)) {
          isAncestorOfOther = true;
          break;
        }
      }
      if (!isAncestorOfOther) {
        innermostMatches.push(matches[i]);
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
  function highlight(elements, color = "red", width = 3) {
    let items;
    if (elements && elements.elements && Array.isArray(elements.elements)) {
      items = elements.elements;
    } else {
      items = Array.isArray(elements) ? elements : [elements];
    }
    items.forEach((item) => {
      const el = item.element ? item.element : item;
      if (el && el.style) {
        el.style.outline = `${width}px solid ${color}`;
        el.style.outlineOffset = "2px";
        el.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.8)`;
        el.classList.add("elementfinder-highlighted");
      }
    });
  }
  function unhighlight(elements) {
    let items;
    if (elements && elements.elements && Array.isArray(elements.elements)) {
      items = elements.elements;
    } else {
      items = Array.isArray(elements) ? elements : [elements];
    }
    items.forEach((item) => {
      const el = item.element ? item.element : item;
      if (el && el.style) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.boxShadow = "";
        el.classList.remove("elementfinder-highlighted");
      }
    });
  }
  function getValidTypes() {
    return Object.keys(ELEMENT_DEFINITIONS);
  }
  return __toCommonJS(element_finder_exports);
})();
