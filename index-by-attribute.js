var ElementFinderByAttribute = (() => {
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

  // src/element-finder-by-attribute.js
  var element_finder_by_attribute_exports = {};
  __export(element_finder_by_attribute_exports, {
    findElementByAttributes: () => findElementByAttributes,
    getAllElements: () => getAllElements,
    getAllFrames: () => getAllFrames,
    getBoundingBox: () => getBoundingBox,
    getSearchableAttributes: () => getSearchableAttributes,
    getValidAttributes: () => getValidAttributes,
    highlight: () => highlight,
    matchesAttribute: () => matchesAttribute,
    setSearchableAttributes: () => setSearchableAttributes,
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
    "hint",
    "title",
    "tooltip",
    "alt",
    "src",
    "aria-labelledby"
  ];

  // src/element-finder-by-attribute.js
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
    if (exact ? textContent === value : textContent.includes(value)) {
      return true;
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
  function getValidAttributes() {
    return [...SEARCHABLE_ATTRIBUTES];
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
  return __toCommonJS(element_finder_by_attribute_exports);
})();
