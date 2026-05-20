# Feature Roadmap

<!-- Generated from feature review - see docs/FEATURE_PLAN.md for details -->

## Phase 1: High-Impact, Low-Effort Features

- [ ] `countElements(type, text, exact, includeHidden, parent)` - Return count without full element data
- [ ] `waitForElement(type, text, timeout, interval, exact, includeHidden, parent)` - Poll until found or timeout
- [ ] `getElementState(element)` - Get `{ visible, enabled, selected, checked, focused }` state

## Phase 2: Utility Features

- [ ] `generateSelector(element)` - Generate unique CSS selector for an element
- [ ] `findElements(types, text, options)` - Batch find multiple types at once
- [ ] `getPerformanceMetrics()` - Timing info from last find operation

## Phase 3: Advanced Features

- [ ] `findElementByRegex(pattern, flags)` - Regex-based text matching
- [ ] `getAccessibilityTree(element)` - Computed accessibility properties
- [ ] `clickElement(element)` / `typeIntoElement(element, text)` - Direct interaction helpers
