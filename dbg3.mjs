import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getElementDescriptorText, getElementDescriptorType, getAllElements } from './src/element-finder.js';

const fixturePath = resolve('tests/fixtures/element-types-unit.html');
const html = readFileSync(fixturePath, 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });
const window = dom.window;
const document = window.document;

global.document = document;
global.Node = window.Node;
global.window = window;

const all = getAllElements(document);
console.log('total elements:', all.length);
const btn = all.find((e) => e.tagName === 'BUTTON');
console.log('found button:', !!btn, btn && btn.textContent);
if (btn) {
  console.log('getElementDescriptorText:', JSON.stringify(getElementDescriptorText(btn)));
  console.log('getElementDescriptorType:', getElementDescriptorType(btn));
  console.log('Node.TEXT_NODE:', Node.TEXT_NODE, 'nodeType:', btn.childNodes[0] && btn.childNodes[0].nodeType);
}
