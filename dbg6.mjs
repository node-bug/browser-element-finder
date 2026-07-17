import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getAccessibilityTree, getAllElements } from './src/element-finder.js';

const fixturePath = resolve('tests/fixtures/element-types-unit.html');
const html = readFileSync(fixturePath, 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });
const window = dom.window;
const document = window.document;

global.document = document;
global.Node = window.Node;
global.window = window;

const els = getAllElements(window.document);
console.log('getAllElements(window.document).length:', els.length);
console.log('getAccessibilityTree(window)[0].elements.length:', getAccessibilityTree(window)[0].elements.length);
console.log('getAccessibilityTree(window, false)[0].elements.length:', getAccessibilityTree(window, false)[0].elements.length);
console.log('getAccessibilityTree(false)[0].elements.length:', getAccessibilityTree(false)[0].elements.length);
