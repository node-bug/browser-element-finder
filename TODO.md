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
- [x] `findOverlayElements(x, y)` - Find overlay/modal/dialog/banner elements on the page (full scan or at a specific point via elementsFromPoint)
- [ ] `waitForElement(type, text, timeout, interval, exact, parent)` - Poll until found or timeout
- [ ] `getElementState(element)` - Get `{ visible, enabled, selected, checked, focused }` state

## Phase 2: Utility Features

- [ ] `generateSelector(element)` - Generate unique CSS selector for an element
- [ ] `findElements(types, text, options)` - Batch find multiple types at once
- [ ] `getPerformanceMetrics()` - Timing info from last find operation

## Phase 3: Advanced Features

- [ ] `findElementByRegex(pattern, flags)` - Regex-based text matching
- [x] `getAccessibilityTree(viewportOnly = false)` - Accessibility tree across all same-origin frames (main frame `frame: -1`, iframes `0, 1, …`); `viewportOnly=true` scans only in-viewport elements, `false` (default) returns the complete page. Uses the global `window`.
- [ ] `clickElement(element)` / `typeIntoElement(element, text)` - Direct interaction helpers

Yes. Right now your overlay detection is essentially:

1. Find elements that "look like" dialogs/modals (`findOverlayElements()`).
2. Remove ancestors/descendants of the clicked element.
3. Pick the candidate containing the most actionable children.

That works surprisingly well for modals, but it misses several common interception cases:

- sticky headers
- cookie banners
- floating chat widgets
- loading masks
- transparent overlays
- offscreen dialogs
- portals rendered at the end of `<body>`
- elements with extremely high `z-index` that don't match your heuristics

I'd probably change the detection to be based on **what actually intercepted the click** instead of trying to infer which element is an overlay.

---

## 1. Use `elementFromPoint()` first (biggest improvement)

Selenium throws `ElementClickInterceptedError` because something is physically on top of the click location.

After interception:

```js
const rect = element.getBoundingClientRect()

const x = rect.left + rect.width / 2
const y = rect.top + rect.height / 2

const top = document.elementFromPoint(x, y)
```

If

```js
top !== element
```

then you've immediately found the blocker.

Even better:

```js
let blocker = top

while (blocker && blocker !== document.body && blocker.contains(element)) {
  blocker = blocker.parentElement
}
```

or climb until you reach something that resembles a dialog.

This is much more accurate than scanning the DOM.

---

## 2. Walk ancestors of the blocker

Suppose

```
<div class="modal">
    <div class="content">
        <button>Close</button>
    </div>
</div>
```

`elementFromPoint()` returns

```
button
```

or

```
.content
```

You really want

```
.modal
```

Walk upward looking for

- role="dialog"
- aria-modal
- popover
- fixed positioning
- high z-index
- backdrop
- etc.

---

## 3. Score overlays instead of boolean matching

Instead of

```js
Te(element)
```

return a score.

Example:

```js
score = 0

if (role === 'dialog') score += 100
if (ariaModal) score += 100
if (tagName === 'DIALOG') score += 80

if (position === 'fixed') score += 40
if (position === 'sticky') score += 15

score += zIndex / 100

if (coversCenter) score += 50

if (hasBackdropColor) score += 20

if (containsActionableElements) score += 20
```

Pick the highest score.

This handles frameworks much better.

---

## 4. Check whether the overlay actually overlaps the click target

Currently every detected modal is considered.

Instead compare rectangles.

```js
const a = target.getBoundingClientRect()
const b = overlay.getBoundingClientRect()

const overlap = !(
  a.right < b.left ||
  a.left > b.right ||
  a.bottom < b.top ||
  a.top > b.bottom
)
```

Ignore overlays that don't overlap.

---

## 5. Check stacking order

A modal with

```
z-index: 1
```

cannot intercept a button with

```
z-index: 1000
```

Read computed styles:

```js
const style = getComputedStyle(element)

const z = Number(style.zIndex)
```

Large z-index values are extremely informative.

---

## 6. Detect fullscreen blockers

Loading spinners often look like

```
position: fixed
left:0
top:0
right:0
bottom:0
```

or

```
width:100vw
height:100vh
```

These should receive a huge score.

---

## 7. Ignore tiny floating widgets

Something like

```
Intercom
Drift
Crisp
```

might have

```
position: fixed
z-index:99999
```

but occupy only

```
60x60
```

Don't classify those as overlays.

Require something like

```js
const area = rect.width * rect.height

const viewport = window.innerWidth * window.innerHeight

area / viewport > 0.1
```

or require overlap with the click point.

---

## 8. Use Selenium's interception message

ChromeDriver often reports

```
Other element would receive the click:

<div class="modal-backdrop">
```

or

```
<div class="cookie-banner">
```

You can sometimes extract the tag/class directly from

```
err.message
```

That gives you the exact blocking element without scanning.

---

## 9. Use `elementsFromPoint()`

This is even better than `elementFromPoint()`.

```js
const stack = document.elementsFromPoint(x, y)
```

Example:

```
[
    button.close,
    div.modal,
    div.backdrop,
    body
]
```

Now you know the complete stacking order.

You can simply pick the first ancestor matching

- dialog
- modal
- fixed
- aria-modal

This is extremely reliable.

---

## 10. Replace "most children" with "most relevant"

This part:

```js
const final = store.reduce(...)
```

chooses the overlay with the largest number of actionable descendants.

That fails if:

- cookie banner has 30 buttons
- modal has 2 buttons

You'll incorrectly choose the cookie banner.

A better score could combine multiple signals:

```js
score =
  visibleActionables * 5 +
  zIndex +
  overlapScore +
  fixedPositionScore +
  dialogRoleScore +
  viewportCoverageScore
```

---

### Overall recommendation

I would redesign `getOverlayElement()` around the click location rather than a global DOM scan. A robust flow is:

1. On `ElementClickInterceptedError`, get the target's center coordinates.
2. Call `document.elementsFromPoint(centerX, centerY)`.
3. Walk the returned stack from front to back.
4. For each element, walk up its ancestors looking for a container with modal-like characteristics (`role="dialog"`, `aria-modal`, `<dialog>`, `popover`, `position: fixed`, substantial viewport coverage, high `z-index`).
5. If none is found, fall back to your existing `findOverlayElements()` scoring logic.

This approach is generally more accurate because it identifies the element that actually blocked the attempted click, rather than trying to infer the active overlay from all overlay-like elements in the document.
