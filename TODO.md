# Feature Roadmap

<!-- Generated from feature review - see docs/FEATURE_PLAN.md for details -->

## Completed Optimizations

- [x] **Innermost element filtering**: O(n²) → O(n) algorithm using Set-based lookups
- [x] **Column expansion**: O(n²) → O(n) algorithm using Map-based column position lookups with colspan support
- [x] **Code deduplication**: Extracted common element extraction logic for `highlight`/`unhighlight`
- [x] **Null input handling**: `extractElements` now guards against null/undefined input
- [x] **Shadow DOM safety**: `getAllElements` wraps shadowRoot access in try-catch for restricted elements
- [x] **Animation control**: `pauseAnimations()` and `resumeAnimations()` for stable screenshots

## Phase 1: High-Impact, Low-Effort Features

- [x] `findElements(type, text, exact, parent)` - Combined type and attribute search (completed)
- [x] `isHidden` flag - All returned elements include `isHidden` property for visibility detection
- [x] `getElementCounts(type, parent)` - Return counts by semantic element type and visibility
- [x] `findOverlayElements()` - Find overlay/modal/dialog/banner elements on the page
- [ ] `waitForElement(type, text, timeout, interval, exact, parent)` - Poll until found or timeout
- [ ] `getElementState(element)` - Get `{ visible, enabled, selected, checked, focused }` state

## Phase 2: Utility Features

- [ ] `generateSelector(element)` - Generate unique CSS selector for an element
- [ ] `findElements(types, text, options)` - Batch find multiple types at once
- [ ] `getPerformanceMetrics()` - Timing info from last find operation

## Phase 3: Advanced Features

- [ ] `findElementByRegex(pattern, flags)` - Regex-based text matching
- [ ] `getAccessibilityTree(element)` - Computed accessibility properties
- [ ] `clickElement(element)` / `typeIntoElement(element, text)` - Direct interaction helpers
