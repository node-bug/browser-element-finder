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
    addIgnoredTags: () => addIgnoredTags,
    findElements: () => findElements,
    findElementsByAttribute: () => findElementsByAttribute,
    findElementsByType: () => findElementsByType,
    findProbableElements: () => findProbableElements,
    getAllElements: () => getAllElements,
    getAllFrames: () => getAllFrames,
    getBoundingBox: () => getBoundingBox,
    getDirectText: () => getDirectText,
    getIgnoredTags: () => getIgnoredTags,
    getNearbyLabelText: () => getNearbyLabelText,
    getResolvedAriaLabelledByText: () => getResolvedAriaLabelledByText,
    getSearchableAttributes: () => getSearchableAttributes,
    getValidTypes: () => getValidTypes,
    highlight: () => highlight,
    inViewport: () => inViewport,
    isHidden: () => isHidden,
    isIgnoredElement: () => isIgnoredElement,
    matchesAttribute: () => matchesAttribute,
    matchesType: () => matchesType,
    parseCondition: () => parseCondition,
    parseXPath: () => parseXPath,
    pauseAnimations: () => pauseAnimations,
    removeIgnoredTags: () => removeIgnoredTags,
    resumeAnimations: () => resumeAnimations,
    setIgnoredTags: () => setIgnoredTags,
    setSearchableAttributes: () => setSearchableAttributes,
    shortenDescriptorText: () => shortenDescriptorText,
    splitByOperator: () => splitByOperator,
    unhighlight: () => unhighlight
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

  // src/searchable-attributes.json
  var searchable_attributes_default = [
    "name",
    "aria-label",
    "aria-labelledby",
    "aria-placeholder",
    "aria-valuetext",
    "aria-description",
    "placeholder",
    "hint",
    "title",
    "tooltip",
    "alt",
    "data-value",
    "data-test-id",
    "data-testid",
    "id",
    "resource-id",
    "src",
    "value"
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
  var MAX_IDENTIFIABLE_TEXT_LENGTH = 25;
  var DEFAULT_IGNORED_TAGS = ["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD"];
  var IGNORED_TAGS = new Set(DEFAULT_IGNORED_TAGS);
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
  function normalizeTagList(tags) {
    if (!Array.isArray(tags)) {
      throw new TypeError("tags must be an array");
    }
    const normalizedTags = [];
    for (let i = 0; i < tags.length; i++) {
      if (typeof tags[i] === "string" && tags[i].trim() !== "") {
        normalizedTags.push(tags[i].toUpperCase());
      }
    }
    return normalizedTags;
  }
  function setIgnoredTags(tags) {
    IGNORED_TAGS = new Set(normalizeTagList(tags));
  }
  function getIgnoredTags() {
    return [...IGNORED_TAGS].sort();
  }
  function addIgnoredTags(tags) {
    const normalizedTags = normalizeTagList(tags);
    for (let i = 0; i < normalizedTags.length; i++) {
      IGNORED_TAGS.add(normalizedTags[i]);
    }
  }
  function removeIgnoredTags(tags) {
    const normalizedTags = normalizeTagList(tags);
    for (let i = 0; i < normalizedTags.length; i++) {
      IGNORED_TAGS.delete(normalizedTags[i]);
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
  function getSearchableTextContent(el) {
    if (el == null || isIgnoredElement(el)) return "";
    let text = "";
    const stack = [el];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
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
  function shortenDescriptorText(text) {
    if (text == null) return "";
    const lines = String(text).split(/\r\n|\r|\n/);
    let resultText = "";
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine) {
        resultText = trimmedLine;
        break;
      }
    }
    if (!resultText || resultText.length <= MAX_IDENTIFIABLE_TEXT_LENGTH) {
      return resultText;
    }
    const shortened = resultText.slice(0, MAX_IDENTIFIABLE_TEXT_LENGTH);
    const lastSpaceIndex = shortened.lastIndexOf(" ");
    return lastSpaceIndex > 0 ? shortened.slice(0, lastSpaceIndex) : resultText;
  }
  function cssEscapeId(id) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(id);
    }
    return id.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  }
  function getNearbyLabelText(el) {
    if (el == null || typeof el.closest !== "function") return "";
    const parentLabel = el.closest("label");
    if (parentLabel) {
      const labelText = shortenDescriptorText(getDirectText(parentLabel));
      if (labelText) return labelText;
    }
    const id = el.getAttribute && el.getAttribute("id");
    if (id) {
      const doc = el.ownerDocument || (typeof document !== "undefined" ? document : null);
      if (doc && typeof doc.querySelector === "function") {
        try {
          const forLabel = doc.querySelector(`label[for="${cssEscapeId(id)}"]`);
          if (forLabel) {
            const labelText = shortenDescriptorText(getDirectText(forLabel));
            if (labelText) return labelText;
          }
        } catch (e) {
        }
      }
    }
    return "";
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
  function matchesAttribute(el, value, exact = false) {
    if (el == null) return false;
    if (value === void 0 || value === null || value === "") return true;
    if (isIgnoredElement(el)) return false;
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
        if (attr === "aria-labelledby") {
          if (exact ? attrValue === value : attrValue.includes(value)) {
            return true;
          }
          const resolvedText = getResolvedAriaLabelledByText(el);
          if (resolvedText) {
            if (exact ? resolvedText === value : resolvedText.includes(value)) {
              return true;
            }
          }
        } else if (exact ? attrValue === value : attrValue.includes(value)) {
          return true;
        }
      }
    }
    const directText = getDirectText(el);
    if (exact ? directText === value : directText.includes(value)) {
      return true;
    }
    const textContent = getSearchableTextContent(el);
    if (exact ? textContent.trim() === value : textContent.includes(value)) {
      return true;
    }
    const nearbyLabel = getNearbyLabelText(el);
    if (nearbyLabel) {
      if (exact ? nearbyLabel === value : nearbyLabel.includes(value)) {
        return true;
      }
    }
    return false;
  }
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
  function findElementsByType(options = {}) {
    const { type = "element", parent = null } = options;
    if (typeof type !== "string") {
      throw new TypeError(`type must be a string, got ${typeof type}`);
    }
    if (type && !ELEMENT_DEFINITIONS[type]) {
      const message = `Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`;
      console.warn(message);
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
      const hidden = isHidden(item.element);
      const viewportValue = inViewport(item.element);
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex,
          isHidden: hidden,
          inViewport: viewportValue
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden,
        inViewport: viewportValue
      };
    });
    return { elements: qualified };
  }
  function findElementsByAttribute(options = {}) {
    const { value = "", exact = false, parent = null } = options;
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
    const filteredMatches = matches.filter((item) => {
      const el = item.element;
      const hasDirectMatch = hasOwnMatch(el, value, exact);
      if (hasDirectMatch) return true;
      for (const other of matches) {
        if (other.element !== el && el.contains(other.element)) {
          return false;
        }
      }
      return true;
    });
    const qualified = filteredMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      const hidden = isHidden(item.element);
      const viewportValue = inViewport(item.element);
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex,
          isHidden: hidden,
          inViewport: viewportValue
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden,
        inViewport: viewportValue
      };
    });
    return { elements: qualified };
  }
  function hasOwnMatch(el, value, exact = false) {
    if (value === void 0 || value === null || value === "") return true;
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
        if (attr === "aria-labelledby") {
          if (exact ? attrValue === value : attrValue.includes(value)) {
            return true;
          }
          const resolvedText = getResolvedAriaLabelledByText(el);
          if (resolvedText) {
            if (exact ? resolvedText === value : resolvedText.includes(value)) {
              return true;
            }
          }
        } else if (exact ? attrValue === value : attrValue.includes(value)) {
          return true;
        }
      }
    }
    const directText = getDirectText(el);
    if (exact ? directText === value : directText.includes(value)) {
      return true;
    }
    const nearbyLabel = getNearbyLabelText(el);
    if (nearbyLabel) {
      if (exact ? nearbyLabel === value : nearbyLabel.includes(value)) {
        return true;
      }
    }
    return false;
  }
  function findElements(options = {}) {
    if (typeof options !== "object" || Array.isArray(options) || options === null) {
      throw new TypeError("options must be an object");
    }
    const { type = null, text = "", exact = false, parent = null } = options;
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
    const seenElements = /* @__PURE__ */ new Set();
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (seenElements.has(el)) continue;
        if (type !== null && type !== void 0 && !matchesType(el, type)) continue;
        if (text !== "" && !matchesAttribute(el, text, exact)) continue;
        seenElements.add(el);
        matches.push({ element: el, frame });
      }
    }
    const filteredMatches = text !== "" ? matches.filter((item) => {
      const el = item.element;
      const hasDirectMatch = hasOwnMatch(el, text, exact);
      if (hasDirectMatch) return true;
      for (const other of matches) {
        if (other.element !== el && el.contains(other.element)) {
          return false;
        }
      }
      return true;
    }) : matches;
    const qualified = filteredMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      const hidden = isHidden(item.element);
      const viewportValue = inViewport(item.element);
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex,
          isHidden: hidden,
          inViewport: viewportValue
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden,
        inViewport: viewportValue
      };
    });
    return { elements: qualified };
  }
  function getParentElement(el) {
    if (el.parentElement) {
      return el.parentElement;
    }
    try {
      const rootNode = el.getRootNode();
      if (rootNode && rootNode.host) {
        return rootNode.host;
      }
    } catch (e) {
    }
    return null;
  }
  function getSiblingElements(el) {
    const parent = getParentElement(el);
    if (!parent) return [];
    if (parent.shadowRoot) {
      try {
        return Array.from(parent.shadowRoot.children);
      } catch (e) {
        return [];
      }
    }
    return Array.from(parent.children);
  }
  function findNearbyElementType(el, targetType) {
    let parent = getParentElement(el);
    while (parent) {
      if (matchesType(parent, targetType)) {
        return parent;
      }
      parent = getParentElement(parent);
    }
    const immediateChildren = el.children || [];
    for (const child of immediateChildren) {
      if (matchesType(child, targetType)) {
        return child;
      }
    }
    const siblings = getSiblingElements(el);
    for (const sibling of siblings) {
      if (sibling !== el && matchesType(sibling, targetType)) {
        return sibling;
      }
    }
    for (const sibling of siblings) {
      if (sibling === el) continue;
      const siblingElements = getAllElements(sibling);
      for (let i = 0; i < siblingElements.length; i++) {
        if (matchesType(siblingElements[i], targetType)) {
          return siblingElements[i];
        }
      }
    }
    let ancestor = el.parentElement;
    while (ancestor) {
      const ancestorSiblings = getSiblingElements(ancestor);
      for (const sibling of ancestorSiblings) {
        if (sibling !== ancestor) {
          if (matchesType(sibling, targetType)) {
            return sibling;
          }
          const siblingElements = getAllElements(sibling);
          for (let i = 0; i < siblingElements.length; i++) {
            if (matchesType(siblingElements[i], targetType)) {
              return siblingElements[i];
            }
          }
        }
      }
      ancestor = ancestor.parentElement;
    }
    return null;
  }
  function findProbableElements(options = {}) {
    if (typeof options !== "object" || Array.isArray(options) || options === null) {
      throw new TypeError("options must be an object");
    }
    const { type: elementType = null, text: searchText = "", exact: isExact = false, parent: searchParent = null } = options;
    const hasType = elementType !== null && elementType !== void 0 && elementType !== "";
    const hasText = searchText !== "";
    if (hasType && !hasText) {
      return findElements({ type: elementType, parent: searchParent });
    }
    if (!hasType && hasText) {
      return findElementsByAttribute(searchText, isExact, searchParent);
    }
    if (hasType) {
      if (typeof elementType !== "string") {
        throw new TypeError(`elementType must be a string, got ${typeof elementType}`);
      }
      if (!ELEMENT_DEFINITIONS[elementType]) {
        console.warn(`Unknown element type: ${elementType}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
        return { elements: [] };
      }
    }
    if (hasText) {
      if (typeof searchText !== "string") {
        throw new TypeError(`attributeText must be a string, got ${typeof searchText}`);
      }
    }
    const matches = [];
    const seenElements = /* @__PURE__ */ new Set();
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(searchParent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (seenElements.has(el)) continue;
        if (hasType && !matchesType(el, elementType)) continue;
        if (hasText && !matchesAttribute(el, searchText, isExact)) continue;
        seenElements.add(el);
        matches.push({ element: el, frame });
      }
    }
    if (matches.length === 0 && hasType && hasText) {
      const attributeMatches = [];
      for (const frame of frames) {
        const allElements = getAllElements(searchParent || frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (!matchesAttribute(el, searchText, isExact)) continue;
          if (hasOwnMatch(el, searchText, isExact)) {
            attributeMatches.push({ element: el, frame });
          }
        }
      }
      const foundElements = /* @__PURE__ */ new Set();
      for (const match of attributeMatches) {
        const nearbyElement = findNearbyElementType(match.element, elementType);
        if (nearbyElement && !foundElements.has(nearbyElement)) {
          foundElements.add(nearbyElement);
          matches.push({ element: nearbyElement, frame: match.frame });
        }
      }
    }
    const filteredMatches = hasText ? matches.filter((item) => {
      const el = item.element;
      const hasDirectMatch = hasOwnMatch(el, searchText, isExact);
      if (hasDirectMatch) return true;
      for (const other of matches) {
        if (other.element !== el && el.contains(other.element)) {
          return false;
        }
      }
      return true;
    }) : matches;
    const qualified = filteredMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      const hidden = isHidden(item.element);
      const viewportValue = inViewport(item.element);
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex,
          isHidden: hidden,
          inViewport: viewportValue
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex,
        isHidden: hidden,
        inViewport: viewportValue
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
  var animationPauseStack = [];
  function pauseAnimations() {
    const originalStyles = /* @__PURE__ */ new Map();
    const elements = getAllElements();
    for (const el of elements) {
      if (el && el.style) {
        if (el.style.animationPlayState !== "paused") {
          originalStyles.set(el, {
            animationPlayState: el.style.animationPlayState,
            transitionProperty: el.style.transitionProperty,
            webkitAnimationPlayState: el.style.webkitAnimationPlayState,
            webkitTransitionProperty: el.style.webkitTransitionProperty
          });
          el.style.animationPlayState = "paused";
          el.style.transitionProperty = "none";
          el.style.webkitAnimationPlayState = "paused";
          el.style.webkitTransitionProperty = "none";
        }
      }
    }
    let styleSheet = document.getElementById("elementfinder-animation-pause");
    if (!styleSheet) {
      styleSheet = document.createElement("style");
      styleSheet.id = "elementfinder-animation-pause";
      styleSheet.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition-property: none !important;
        -webkit-animation-play-state: paused !important;
        -webkit-transition-property: none !important;
      }
      @media (prefers-reduced-motion: no-preference) {
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
        }
      }
    `;
      document.head.appendChild(styleSheet);
    }
    const pauseState = { originalStyles, pausedCount: originalStyles.size };
    animationPauseStack.push(pauseState);
    return pauseState;
  }
  function resumeAnimations(pauseState) {
    if (!pauseState) {
      if (animationPauseStack.length === 0) return;
      pauseState = animationPauseStack.pop();
    } else {
      const index = animationPauseStack.indexOf(pauseState);
      if (index === -1) return;
      animationPauseStack.splice(index, 1);
    }
    const originalStyles = pauseState.originalStyles;
    if (originalStyles) {
      for (const [el, styles] of originalStyles) {
        if (el && el.style) {
          el.style.animationPlayState = styles.animationPlayState || "";
          el.style.transitionProperty = styles.transitionProperty || "";
          el.style.webkitAnimationPlayState = styles.webkitAnimationPlayState || "";
          el.style.webkitTransitionProperty = styles.webkitTransitionProperty || "";
        }
      }
    }
    if (animationPauseStack.length === 0) {
      const styleSheet = document.getElementById("elementfinder-animation-pause");
      if (styleSheet) {
        styleSheet.remove();
      }
    }
  }
  function getValidTypes() {
    return Object.keys(ELEMENT_DEFINITIONS);
  }
  function normalizeDescriptorText(text) {
    if (text == null) return "";
    return String(text).replace(/\s+/g, " ").trim();
  }
  function getResolvedAriaLabelledByText(el) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (!labelledBy) return "";
    const ids = labelledBy.split(/\s+/);
    const ownerDocument = el.ownerDocument || document;
    let text = "";
    for (const id of ids) {
      try {
        const refEl = ownerDocument.getElementById(id);
        if (!refEl) continue;
        const refText = normalizeDescriptorText(refEl.textContent);
        if (refText) {
          text = text ? `${text} ${refText}` : refText;
        }
      } catch (e) {
      }
    }
    return text;
  }
  return __toCommonJS(element_finder_exports);
})();
