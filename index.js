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
    getValidTypes: () => getValidTypes,
    highlight: () => highlight,
    matchesType: () => matchesType,
    parseCondition: () => parseCondition,
    parseXPath: () => parseXPath,
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
    const matcher = TYPE_MATCHERS.get(type);
    return matcher ? matcher(el) : false;
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
  function expandColumnMatches(matches, text, type) {
    if (!text || type !== "column") return matches;
    const expandedMatches = [];
    const seenElements = /* @__PURE__ */ new Set();
    const tableCache = /* @__PURE__ */ new Map();
    for (const match of matches) {
      const el = match.element;
      const frame = match.frame;
      if (!seenElements.has(el)) {
        expandedMatches.push(match);
        seenElements.add(el);
      }
      if (type === "column") {
        const table = el.closest("table");
        if (!table) continue;
        let tableData = tableCache.get(table);
        if (!tableData) {
          tableData = buildTableColumnData(table);
          if (!tableData) continue;
          tableCache.set(table, tableData);
        }
        const colPosition = findElementColumnPosition(el, tableData.elementToCol);
        if (colPosition === null) continue;
        const headerInfo = tableData.colPositions.find((info) => colPosition >= info.colStart && colPosition <= info.colEnd);
        if (!headerInfo) continue;
        for (const rowData of tableData.rowColMaps) {
          for (let col = headerInfo.colStart; col <= headerInfo.colEnd; col++) {
            const cell = rowData.map.get(col);
            if (!cell || seenElements.has(cell)) continue;
            expandedMatches.push({ element: cell, frame });
            seenElements.add(cell);
          }
        }
      }
    }
    return expandedMatches;
  }
  function buildTableColumnData(table) {
    const thead = table.querySelector("thead");
    if (!thead) return null;
    const headerRow = thead.querySelector("tr");
    if (!headerRow) return null;
    const headerCells = Array.from(headerRow.children);
    const colPositions = [];
    let currentCol = 0;
    for (let i = 0; i < headerCells.length; i++) {
      const cell = headerCells[i];
      const colspan = parseInt(cell.getAttribute("colspan")) || 1;
      colPositions.push({ cell, colStart: currentCol, colEnd: currentCol + colspan - 1 });
      currentCol += colspan;
    }
    const allRows = table.querySelectorAll("tr");
    const rowColMaps = [];
    const elementToCol = /* @__PURE__ */ new Map();
    for (let r = 0; r < allRows.length; r++) {
      const row = allRows[r];
      const cells = Array.from(row.children);
      const rowColMap = /* @__PURE__ */ new Map();
      let rowCol = 0;
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        const colspan = parseInt(cell.getAttribute("colspan")) || 1;
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
  function findElementColumnPosition(el, elementToCol) {
    var _a;
    return (_a = elementToCol.get(el)) != null ? _a : null;
  }
  function isElementHidden(el, elWindow) {
    const style = elWindow.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return true;
    }
    if (style.visibility === "collapse") {
      return true;
    }
    if (el.offsetWidth === 0 || el.offsetHeight === 0) {
      return true;
    }
    const ariaHidden = el.getAttribute("aria-hidden");
    if (ariaHidden === "true") {
      return true;
    }
    let parent = el.parentElement;
    while (parent) {
      const parentStyle = elWindow.getComputedStyle(parent);
      if (parentStyle.display === "none" || parentStyle.visibility === "hidden") {
        return true;
      }
      parent = parent.parentElement;
    }
    const rect = el.getBoundingClientRect();
    if (style.position === "absolute" || style.position === "fixed") {
      const left = parseInt(style.left) || 0;
      const top = parseInt(style.top) || 0;
      if (left < -1e3 && left !== -Infinity || top < -1e3 && top !== -Infinity) {
        return true;
      }
      if (rect.bottom < -1e3 || rect.right < -1e3 || rect.top > elWindow.innerHeight + 1e3 || rect.left > elWindow.innerWidth + 1e3) {
        return true;
      }
    }
    const textIndent = parseInt(style.textIndent) || 0;
    if (textIndent < -1e3) {
      return true;
    }
    if (style.clipPath && style.clipPath !== "none") {
      if (style.clipPath.includes("inset(100%)") || style.clipPath.includes("circle(0)") || style.clipPath.includes("polygon(0% 0%,0% 0%,0% 0%,0% 0%)")) {
        return true;
      }
    }
    if (style.width === "0" && style.height === "0" || style.width === "0px" && style.height === "0px") {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) {
        return true;
      }
    }
    return false;
  }
  function calculateDistance(el1, el2) {
    const box1 = getBoundingBox(el1);
    const box2 = getBoundingBox(el2);
    const dx = box1.midx - box2.midx;
    const dy = box1.midy - box2.midy;
    return Math.sqrt(dx * dx + dy * dy);
  }
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
  function filterToInnermost(matches) {
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
    const finalMatches = [];
    const labelableElements = /* @__PURE__ */ new Set(["BUTTON", "INPUT", "KEYGEN", "METER", "OUTPUT", "PROGRESS", "SELECT", "TEXTAREA"]);
    const seenElements = /* @__PURE__ */ new Set();
    for (const match of innermostMatches) {
      const el = match.element;
      if (seenElements.has(el)) continue;
      seenElements.add(el);
      if (el.tagName === "LABEL") {
        let hasAssociatedControl = false;
        if (el.htmlFor) {
          const control = el.ownerDocument.getElementById(el.htmlFor);
          if (control && seenElements.has(control)) {
            hasAssociatedControl = true;
          }
        }
        if (!hasAssociatedControl) {
          for (const labelableTag of labelableElements) {
            const control = el.querySelector(labelableTag.toLowerCase());
            if (control && seenElements.has(control)) {
              hasAssociatedControl = true;
              break;
            }
          }
        }
        if (hasAssociatedControl) continue;
      }
      finalMatches.push(match);
    }
    return finalMatches;
  }
  function formatResults(expandedMatches) {
    const qualified = expandedMatches.map((item) => {
      const boundingBox = getBoundingBox(item.element);
      const tagName = item.element.tagName.toLowerCase();
      if (!item.frame.isMainFrame) {
        return {
          boundingBox,
          tagName,
          frameIndex: item.frame.frameIndex,
          isVisible: item.isVisible
        };
      }
      return {
        element: item.element,
        boundingBox,
        tagName,
        frameIndex: item.frame.frameIndex,
        isVisible: item.isVisible
      };
    });
    return { elements: qualified };
  }
  function findElement(type = "element", text = null, exact = false, parent = null) {
    var _a, _b, _c;
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
    const frames = getAllFrames(window);
    const typeAndTextMatches = [];
    const attributeMatches = [];
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const typeMatches = type && matchesType(el, type);
        const textMatches = text === void 0 || text === null || matchesContent(el, text, exact);
        if (typeMatches && textMatches) {
          const elWindow = ((_a = el.ownerDocument) == null ? void 0 : _a.defaultView) || frame.window;
          const isVisible = !isElementHidden(el, elWindow);
          typeAndTextMatches.push({ element: el, frame, isVisible });
        }
        if (text && matchesContent(el, text, exact)) {
          attributeMatches.push({ element: el, frame });
        }
      }
    }
    if (typeAndTextMatches.length > 0) {
      const innermostMatches = filterToInnermost(typeAndTextMatches);
      const expandedMatches = expandColumnMatches(innermostMatches, text, type);
      return formatResults(expandedMatches);
    }
    if (text && attributeMatches.length > 0) {
      const resultsByNearestType = [];
      const seenElements = /* @__PURE__ */ new Set();
      for (const textMatch of attributeMatches) {
        const textEl = textMatch.element;
        if (seenElements.has(textEl)) continue;
        const frame = textMatch.frame;
        const typeElements = [];
        const allElements = getAllElements(parent || frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (matchesType(el, type)) {
            typeElements.push(el);
          }
        }
        if (typeElements.length > 0) {
          const nearest = findNearestElement(textEl, typeElements);
          if (nearest) {
            const elWindow = ((_b = nearest.ownerDocument) == null ? void 0 : _b.defaultView) || frame.window;
            const isVisible = !isElementHidden(nearest, elWindow);
            resultsByNearestType.push({ element: nearest, frame, isVisible });
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
    if (type && type !== "element") {
      const typeMatches = [];
      for (const frame of frames) {
        const allElements = getAllElements(parent || frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (matchesType(el, type)) {
            const elWindow = ((_c = el.ownerDocument) == null ? void 0 : _c.defaultView) || frame.window;
            const isVisible = !isElementHidden(el, elWindow);
            typeMatches.push({ element: el, frame, isVisible });
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
      const el = item && item.element ? item.element : item;
      if (el && typeof el === "object" && "style" in el) {
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
      const el = item && item.element ? item.element : item;
      if (el && typeof el === "object" && "style" in el) {
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
  return __toCommonJS(element_finder_exports);
})();
