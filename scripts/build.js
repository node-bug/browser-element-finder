#!/usr/bin/env node

/**
 * Build script: Generates index.js and index.min.js from src/element-finder.js
 *
 * Uses esbuild to bundle the ESM source into a browser-compatible IIFE format.
 */

import { build } from 'esbuild';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

async function runBuild() {
  const entryPoint = join(repoRoot, 'src', 'element-finder.js');
  const outputFile = join(repoRoot, 'index.js');
  const minifiedFile = join(repoRoot, 'index.min.js');

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