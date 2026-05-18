#!/usr/bin/env node

/**
 * Build script: Generates index.js from src/element-finder.js
 * 
 * Converts ES module exports to browser-compatible IIFE format.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceFile = join(__dirname, 'src', 'element-finder.js');
const searchableAttributesFile = join(__dirname, 'src', 'searchable-attributes.json');
const elementDefinitionsFile = join(__dirname, 'src', 'element-definitions.json');
const outputFile = join(__dirname, 'index.js');

// Read the JSON files
const searchableAttributes = readFileSync(searchableAttributesFile, 'utf8');
const elementDefinitions = readFileSync(elementDefinitionsFile, 'utf8');

// Read the source file
let source = readFileSync(sourceFile, 'utf8');

// Remove the file header comment from src/element-finder.js
source = source.replace(/\/\*\*[\s\S]*?\*\/\s*/, '');

// Remove the JSON import lines
source = source.replace(/import\s+searchableAttributesData[^;]+;\s*/, '');
source = source.replace(/import\s+elementDefinitionsData[^;]+;\s*/, '');

// Replace the JSON imports with inline data
source = source.replace(/let SEARCHABLE_ATTRIBUTES = searchableAttributesData;/, 
  `let SEARCHABLE_ATTRIBUTES = ${searchableAttributes};`);
source = source.replace(/export const ELEMENT_DEFINITIONS = Object\.freeze\(elementDefinitionsData\);/, 
  `const ELEMENT_DEFINITIONS = Object.freeze(${elementDefinitions});`);

// Remove the export keywords
let code = source.replace(/^export\s+/gm, '');

// Wrap in IIFE with proper header
const output = `/**
 * Browser Element Finder
 * 
 * A standalone JavaScript library that can be run in the browser to identify
 * elements by type and/or text content, returning matching elements with their
 * bounding boxes.
 * 
 * Usage in browser console:
 *   // Find all buttons
 *   const results = ElementFinder.findElement('button');
 *   
 *   // Find buttons with specific text
 *   const results = ElementFinder.findElement('button', 'Submit');
 *   
 *   // Find elements by text only
 *   const results = ElementFinder.findElement(null, 'seleniumbase');
 *   
 *   // Find links with specific text
 *   const results = ElementFinder.findElement('link', 'seleniumbase');
 *   
 *   // Find hidden elements
 *   const results = ElementFinder.findElement('button', null, false, true);
 */

const ElementFinder = (function() {
${code}

  // Public API
  return {
    findElement,
    highlight,
    unhighlight,
    getValidTypes,
    getBoundingBox,
    setSearchableAttributes,
    getSearchableAttributes,
    parseXPath,
    splitByOperator,
    parseCondition,
    matchesType,
    matchesContent,
    getAllElements,
    getAllFrames,
    ELEMENT_DEFINITIONS
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementFinder;
}
`;

// Write the output file
writeFileSync(outputFile, output, 'utf8');

console.log('✓ Built index.js from src/element-finder.js');