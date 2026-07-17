import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getAccessibilityTree } from './src/element-finder.js';

const fixturePath = resolve('tests/fixtures/element-types-unit.html');
const html = readFileSync(fixturePath, 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });
const window = dom.window;
const document = window.document;

console.log('global.Node before set:', typeof global.Node);
global.document = document;
global.Node = window.Node;
global.window = window;
console.log('global.Node after set:', typeof global.Node, 'window.Node:', typeof window.Node);

const tree = getAccessibilityTree(window);
console.log('tree length:', tree.length, 'frame0 elements:', tree[0].elements.length);
console.log('first 5:', tree[0].elements.slice(0, 5));
