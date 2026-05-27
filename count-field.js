import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
const html = readFileSync('./tests/integration/fixtures/forms.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

// Count innermost elements with 'Field' in text content
const allElements = doc.querySelectorAll('*');
let matches = [];
for (let el of allElements) {
  if (el.textContent && el.textContent.includes('Field')) {
    matches.push(el);
  }
}

// Apply innermost match logic
const matchedElements = new Set(matches);
const excludedElements = new Set();
const innermostMatches = [];

for (let i = matches.length - 1; i >= 0; i--) {
  const el = matches[i];
  if (!excludedElements.has(el)) {
    innermostMatches.unshift(el);
    let parentEl = el.parentElement;
    while (parentEl) {
      if (matchedElements.has(parentEl)) {
        excludedElements.add(parentEl);
      }
      parentEl = parentEl.parentElement;
    }
  }
}

console.log('Innermost matches with Field:', innermostMatches.length);
innermostMatches.forEach(el => {
  console.log(el.tagName, el.id || el.className || (el.textContent?.trim().substring(0, 30)));
});