#!/usr/bin/env node

/**
 * Build script: Generates index.js and index.min.js from src/element-finder.js
 *
 * Uses esbuild to bundle the ESM source into a browser-compatible IIFE format.
 */

import { build } from 'esbuild';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runBuild() {
  const entryPoint = join(__dirname, 'src', 'element-finder.js');
  const outputFile = join(__dirname, 'index.js');
  const minifiedFile = join(__dirname, 'index.min.js');

  try {
    // 1. Build the unminified IIFE bundle
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: outputFile,
      format: 'iife',
      globalName: 'ElementFinder',
      sourcemap: false,
      minify: false,
      platform: 'browser',
      target: 'es2015',
    });

    // 2. Build the minified IIFE bundle
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: minifiedFile,
      format: 'iife',
      globalName: 'ElementFinder',
      sourcemap: false,
      minify: true,
      platform: 'browser',
      target: 'es2015',
    });

    console.log('✓ Built index.js and index.min.js using esbuild');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();