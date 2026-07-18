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
    findOverlayElements: () => findOverlayElements,
    findProbableElements: () => findProbableElements,
    getAllElements: () => getAllElements,
    getAllFrames: () => getAllFrames,
    getBoundingBox: () => getBoundingBox,
    getElementCounts: () => getElementCounts,
    getElementDescriptor: () => getElementDescriptor,
    getElementInventory: () => getElementInventory,
    getFormState: () => getFormState,
    getIgnoredTags: () => getIgnoredTags,
    getSearchableAttributeValues: () => getSearchableAttributeValues,
    getSearchableAttributes: () => getSearchableAttributes,
    getValidAttributes: () => getValidAttributes,
    getValidTypes: () => getValidTypes,
    getViewportElementCounts: () => getViewportElementCounts,
    highlight: () => highlight,
    inViewport: () => inViewport,
    isHidden: () => isHidden,
    matchesAttribute: () => matchesAttribute,
    matchesType: () => matchesType,
    parseCondition: () => parseCondition,
    parseXPath: () => parseXPath,
    pauseAnimations: () => pauseAnimations,
    removeIgnoredTags: () => removeIgnoredTags,
    resumeAnimations: () => resumeAnimations,
    setIgnoredTags: () => setIgnoredTags,
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
  var TEXTLESS_TYPES = new Set(
    Object.keys(element_definitions_default).filter(
      (type) => type !== "element" && type !== "iframe"
    )
  );
  var DEFAULT_IGNORED_TAGS = ["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"];
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
  function getSearchableAttributeValues(el) {
    if (el == null || el.nodeType !== Node.ELEMENT_NODE) return {};
    const values = {};
    const attrs = SEARCHABLE_ATTRIBUTES;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      let attrValue;
      try {
        attrValue = el.getAttribute(attr);
      } catch (e) {
        continue;
      }
      if (attrValue !== null && attrValue !== void 0 && attrValue !== "") {
        values[attr] = attrValue;
      }
    }
    return values;
  }
  function normalizeDescriptorText(text) {
    if (text == null) return "";
    return String(text).replace(/\s+/g, " ").trim();
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
  function getImageFilenameWithoutExtension(src) {
    const normalizedSrc = normalizeDescriptorText(src);
    if (!normalizedSrc) return "";
    const withoutQueryOrFragment = normalizedSrc.split(/[?#]/)[0];
    const lastSlashIndex = Math.max(
      withoutQueryOrFragment.lastIndexOf("/"),
      withoutQueryOrFragment.lastIndexOf("\\")
    );
    const filenameWithExtension = lastSlashIndex >= 0 ? withoutQueryOrFragment.slice(lastSlashIndex + 1) : withoutQueryOrFragment;
    const lastDotIndex = filenameWithExtension.lastIndexOf(".");
    return lastDotIndex > 0 ? filenameWithExtension.slice(0, lastDotIndex) : filenameWithExtension;
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
  function getElementDescriptorText(el) {
    const directText = shortenDescriptorText(getDirectText(el));
    if (directText && !isIgnoredElement(el)) {
      return { attributeName: "text", identifiableText: directText };
    }
    const values = getSearchableAttributeValues(el);
    const attrs = SEARCHABLE_ATTRIBUTES;
    let nearbyLabel = "";
    const type = getElementDescriptorType(el);
    if (TEXTLESS_TYPES.has(type)) {
      nearbyLabel = getNearbyLabelText(el);
    }
    const MACHINE_ATTRS = /* @__PURE__ */ new Set([
      "value",
      "id",
      "resource-id",
      "name",
      "src",
      "data-test-id",
      "data-testid",
      "data-value"
    ]);
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (!Object.prototype.hasOwnProperty.call(values, attr)) continue;
      if (nearbyLabel && MACHINE_ATTRS.has(attr)) continue;
      const rawText = attr === "aria-labelledby" ? getResolvedAriaLabelledByText(el) : attr === "src" ? getImageFilenameWithoutExtension(values[attr]) : values[attr];
      if (rawText) {
        return { attributeName: attr, identifiableText: rawText };
      }
    }
    if (nearbyLabel) {
      return { attributeName: "label", identifiableText: nearbyLabel };
    }
    return null;
  }
  function getElementDescriptorFrame(el) {
    if (!el || !el.ownerDocument) return null;
    try {
      const frames = getAllFrames(window);
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].document === el.ownerDocument) {
          return frames[i].document;
        }
      }
    } catch (e) {
    }
    return el.ownerDocument;
  }
  function getElementDescriptorUniqueness(el, text, type, includeHidden = true) {
    const root = getElementDescriptorFrame(el);
    if (!root) {
      return { index: 1 };
    }
    const elements = getAllElements(root);
    const seenElements = /* @__PURE__ */ new Set();
    const descriptorCache = /* @__PURE__ */ new WeakMap();
    const typeCache = /* @__PURE__ */ new WeakMap();
    const matchingDescriptors = [];
    for (let i = 0; i < elements.length; i++) {
      const candidate = elements[i];
      if (seenElements.has(candidate)) continue;
      seenElements.add(candidate);
      if (isIgnoredElement(candidate)) continue;
      if (!includeHidden && isHidden(candidate)) continue;
      let candidateDescriptor = descriptorCache.get(candidate);
      if (candidateDescriptor === void 0) {
        candidateDescriptor = getElementDescriptorText(candidate);
        descriptorCache.set(candidate, candidateDescriptor);
      }
      if (!candidateDescriptor || candidateDescriptor.identifiableText !== text) continue;
      let candidateType = typeCache.get(candidate);
      if (candidateType === void 0) {
        candidateType = getElementDescriptorType(candidate);
        typeCache.set(candidate, candidateType);
      }
      if (candidateType !== type) continue;
      matchingDescriptors.push(candidate);
    }
    const filtered = matchingDescriptors.filter((item) => {
      for (const other of matchingDescriptors) {
        if (other !== item && item.contains(other)) {
          return false;
        }
      }
      return true;
    });
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] === el) {
        return { index: i + 1 };
      }
    }
    return { index: 1 };
  }
  function getElementPositionAmongType(el, type, includeHidden = true) {
    const root = getElementDescriptorFrame(el);
    if (!root) return 1;
    const elements = getAllElements(root);
    const typeCache = /* @__PURE__ */ new WeakMap();
    let position = 1;
    for (let i = 0; i < elements.length; i++) {
      const candidate = elements[i];
      if (candidate === el) break;
      if (isIgnoredElement(candidate)) continue;
      if (!includeHidden && isHidden(candidate)) continue;
      let candidateType = typeCache.get(candidate);
      if (candidateType === void 0) {
        candidateType = getElementDescriptorType(candidate);
        typeCache.set(candidate, candidateType);
      }
      if (candidateType === type) position++;
    }
    return position;
  }
  function getElementDescriptorType(el) {
    if (el == null || el.nodeType !== Node.ELEMENT_NODE) return null;
    const types = Object.keys(ELEMENT_DEFINITIONS);
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      if (type === "element") continue;
      if (matchesType(el, type)) return type;
    }
    return "element";
  }
  function getElementDescriptor(el, includeHidden = true) {
    if (el == null || el.nodeType !== Node.ELEMENT_NODE) {
      return {
        identifiableText: null,
        attributeName: null,
        index: 1,
        type: null,
        tagName: null
      };
    }
    const type = getElementDescriptorType(el);
    const descriptorSource = getElementDescriptorText(el);
    if (!descriptorSource || !descriptorSource.identifiableText) {
      return {
        identifiableText: null,
        attributeName: null,
        index: getElementPositionAmongType(el, type, includeHidden),
        type,
        tagName: el.tagName.toLowerCase(),
        formState: getFormState(el, type)
      };
    }
    const uniqueness = getElementDescriptorUniqueness(el, descriptorSource.identifiableText, type, includeHidden);
    return {
      identifiableText: descriptorSource.identifiableText,
      attributeName: descriptorSource.attributeName,
      index: uniqueness.index,
      type,
      tagName: el.tagName.toLowerCase(),
      formState: getFormState(el, type)
    };
  }
  function getFormState(el, type) {
    if (el == null || type == null) return void 0;
    switch (type) {
      case "textbox":
      case "colorpicker":
      case "datepicker": {
        const read = () => el.value != null ? String(el.value) : "";
        return { value: safeRead(read, "") };
      }
      case "checkbox": {
        const read = () => Boolean(el.checked);
        return { checked: safeRead(read, false) };
      }
      case "radio": {
        const read = () => Boolean(el.checked);
        return { set: safeRead(read, false) };
      }
      case "switch": {
        const read = () => {
          if (typeof el.checked === "boolean") {
            return el.checked;
          }
          const ariaChecked = el.getAttribute("aria-checked");
          return ariaChecked === "true";
        };
        return { on: safeRead(read, false) };
      }
      case "dropdown": {
        const read = () => {
          const optionEls = Array.from(el.options || el.querySelectorAll("option"));
          const options = optionEls.map((o) => (o.textContent || o.getAttribute("value") || "").trim()).filter((t) => t !== "");
          const selectedEl = el.selectedOptions && el.selectedOptions.length > 0 ? el.selectedOptions[0] : el.options ? el.options[el.selectedIndex] : void 0;
          const selected = selectedEl ? (selectedEl.textContent || selectedEl.getAttribute("value") || "").trim() || null : null;
          return { selected, options };
        };
        const fallback = { selected: null, options: [] };
        return safeRead(read, fallback);
      }
      case "slider": {
        const read = () => {
          const raw = el.value != null && el.value !== "" ? Number(el.value) : 0;
          return Number.isNaN(raw) ? 0 : raw;
        };
        return { value: safeRead(read, 0) };
      }
      case "file": {
        const read = () => {
          if (el.files && el.files.length > 0) {
            return el.files[0].name || null;
          }
          return null;
        };
        return { fileName: safeRead(read, null) };
      }
      default:
        return void 0;
    }
  }
  function safeRead(read, fallback) {
    try {
      return read();
    } catch (e) {
      return fallback;
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
  function isOverlayElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const role = el.getAttribute("role");
    if (role === "dialog" || role === "alertdialog" || role === "tooltip" || role === "menu" || role === "listbox") {
      return true;
    }
    if (el.getAttribute("aria-modal") === "true") return true;
    if (el.tagName === "DIALOG" && el.open) return true;
    if (el.hasAttribute("popover")) return true;
    try {
      const style = window.getComputedStyle(el);
      const zIndexValue = parseInt(style.zIndex, 10);
      if (!isNaN(zIndexValue) && zIndexValue > 999) {
        if (style.position === "fixed" || style.position === "sticky") return true;
      }
      if (!isNaN(zIndexValue) && zIndexValue > 100 && style.position === "absolute") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
      }
    } catch (e) {
    }
    const className = el.getAttribute ? el.getAttribute("class") || "" : "";
    if (/[Cc]ookie|[Cc]onsent|[Bb]anner|[Oo]verlay|[Mm]odal|[Pp]opup|[Dd]ropdown|[Mm]enu-[A-z]|Flyout|[Ss]heet/.test(className)) {
      return true;
    }
    return false;
  }
  function findElementsByType(type = "element", parent = null) {
    if (type === null || type === void 0) {
      type = "element";
    }
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
  function findElementsByAttribute(value, exact = false, parent = null) {
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
    return false;
  }
  function getElementCounts(type = null, parent = null) {
    const hasType = type !== null && type !== void 0;
    const targetTypes = hasType ? [type] : Object.keys(ELEMENT_DEFINITIONS);
    if (hasType) {
      if (typeof type !== "string") {
        throw new TypeError(`type must be a string, got ${typeof type}`);
      }
      if (!ELEMENT_DEFINITIONS[type]) {
        console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
        return { [type]: { visible: 0, hidden: 0, total: 0 } };
      }
    }
    const counts = {};
    for (let i = 0; i < targetTypes.length; i++) {
      counts[targetTypes[i]] = { visible: 0, hidden: 0, total: 0 };
    }
    for (let i = 0; i < targetTypes.length; i++) {
      const targetType = targetTypes[i];
      const result = findElements(targetType, null, false, parent);
      const typeCounts = counts[targetType];
      for (let j = 0; j < result.elements.length; j++) {
        const item = result.elements[j];
        const bucket = item.isHidden ? "hidden" : "visible";
        typeCounts[bucket] += 1;
        typeCounts.total += 1;
      }
    }
    return counts;
  }
  function getViewportElementCounts(type = null, parent = null) {
    const hasType = type !== null && type !== void 0;
    const targetTypes = hasType ? [type] : Object.keys(ELEMENT_DEFINITIONS);
    if (hasType) {
      if (typeof type !== "string") {
        throw new TypeError(`type must be a string, got ${typeof type}`);
      }
      if (!ELEMENT_DEFINITIONS[type]) {
        console.warn(`Unknown element type: ${type}. Valid types: ${Object.keys(ELEMENT_DEFINITIONS).join(", ")}`);
        return { [type]: { visible: 0, hidden: 0, total: 0 } };
      }
    }
    const counts = {};
    for (let i = 0; i < targetTypes.length; i++) {
      counts[targetTypes[i]] = { visible: 0, hidden: 0, total: 0 };
    }
    for (let i = 0; i < targetTypes.length; i++) {
      const targetType = targetTypes[i];
      const result = findElements(targetType, null, false, parent);
      const typeCounts = counts[targetType];
      for (let j = 0; j < result.elements.length; j++) {
        const item = result.elements[j];
        if (!item.element || !inViewport(item.element, { threshold: 60 })) continue;
        typeCounts.total += 1;
        const bucket = item.isHidden ? "hidden" : "visible";
        typeCounts[bucket] += 1;
      }
    }
    return counts;
  }
  function formatFormState(formState) {
    if (formState == null) return "";
    const parts = [];
    for (const key of Object.keys(formState)) {
      const value = formState[key];
      if (Array.isArray(value)) {
        parts.push(`${key}:[${value.map((v) => JSON.stringify(v)).join(",")}]`);
      } else if (typeof value === "string") {
        parts.push(`${key}:${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}:${String(value)}`);
      }
    }
    return parts.length > 0 ? `{${parts.join(",")}}` : "";
  }
  function getElementInventory(viewportOnly = true) {
    const frames = getAllFrames(window);
    const tree = [];
    for (let fi = 0; fi < frames.length; fi++) {
      const frameDoc = frames[fi].document;
      const elements = getAllElements(frameDoc);
      const entries = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (viewportOnly && !inViewport(el)) continue;
        const descriptor = getElementDescriptor(el, true);
        const type = descriptor.type || "element";
        if (!descriptor.identifiableText) {
          if (!TEXTLESS_TYPES.has(type)) continue;
          const text = `#${descriptor.index}`;
          const suffix2 = descriptor.formState ? ` ${formatFormState(descriptor.formState)}` : "";
          entries.push(`${type}:${text}${suffix2}`);
          continue;
        }
        const suffix = descriptor.formState ? ` ${formatFormState(descriptor.formState)}` : "";
        entries.push(`${type}:${descriptor.identifiableText}${suffix}`);
      }
      tree.push({ frame: frames[fi].frameIndex, elements: entries });
    }
    return tree;
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
  function findProbableElements(elementType, attributeText, exact = false, parent = null) {
    const hasType = elementType !== null && elementType !== void 0 && elementType !== "";
    const hasText = attributeText !== null && attributeText !== void 0 && attributeText !== "";
    if (hasType && !hasText) {
      return findElements(elementType, null, false, parent);
    }
    if (!hasType && hasText) {
      return findElementsByAttribute(attributeText, exact, parent);
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
      if (typeof attributeText !== "string") {
        throw new TypeError(`attributeText must be a string, got ${typeof attributeText}`);
      }
    }
    const matches = [];
    const seenElements = /* @__PURE__ */ new Set();
    const frames = getAllFrames(window);
    for (const frame of frames) {
      const allElements = getAllElements(parent || frame.document);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (seenElements.has(el)) continue;
        if (hasType && !matchesType(el, elementType)) continue;
        if (hasText && !matchesAttribute(el, attributeText, exact)) continue;
        seenElements.add(el);
        matches.push({ element: el, frame });
      }
    }
    if (matches.length === 0 && hasType && hasText) {
      const attributeMatches = [];
      for (const frame of frames) {
        const allElements = getAllElements(parent || frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (!matchesAttribute(el, attributeText, exact)) continue;
          if (hasOwnMatch(el, attributeText, exact)) {
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
      const hasDirectMatch = hasOwnMatch(el, attributeText, exact);
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
  function findOverlayElements(x = null, y = null) {
    const hasPoint = x !== null && x !== void 0 || y !== null && y !== void 0;
    if (hasPoint) {
      if (x === null || x === void 0 || y === null || y === void 0) {
        throw new TypeError("Both x and y coordinates must be provided together");
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new TypeError("x and y must be finite numbers");
      }
    }
    const matches = [];
    const seenElements = /* @__PURE__ */ new Set();
    if (hasPoint) {
      const pointStack = document.elementsFromPoint(x, y);
      const mainFrame = { window, document, isMainFrame: true, frameIndex: -1 };
      for (let i = 0; i < pointStack.length; i++) {
        const el = pointStack[i];
        if (seenElements.has(el)) continue;
        if (!isOverlayElement(el)) continue;
        seenElements.add(el);
        matches.push({ element: el, frame: mainFrame });
      }
    } else {
      const frames = getAllFrames(window);
      for (const frame of frames) {
        const allElements = getAllElements(frame.document);
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (seenElements.has(el)) continue;
          if (!isOverlayElement(el)) continue;
          seenElements.add(el);
          matches.push({ element: el, frame });
        }
      }
    }
    const qualified = matches.map((item) => {
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
  function getValidAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
  }
  return __toCommonJS(element_finder_exports);
})();
