import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getAccessibilityTree, getAllFrames } from './src/element-finder.js';

const fixturePath = resolve('tests/fixtures/element-types-unit.html');
const html = readFileSync(fixturePath, 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost', pretendToBeVisual: true });
const window = dom.window;
const document = window.document;

global.document = document;
global.Node = window.Node;
global.window = window;

console.log('getAllFrames(false).length:', getAllFrames(false).length);
console.log('getAllFrames(window).length:', getAllFrames(window).length);
console.log('getAccessibilityTree(false).length:', getAccessibilityTree(false).length);
console.log('getAccessibilityTree(window).length:', getAccessibilityTree(window).length);
console.log('getAccessibilityTree(window, false)[0].elements.length:', getAccessibilityTree(window, false)[0].elements.length);
