#!/usr/bin/env node

/**
 * Build script: Generates index.js/index.min.js and inventory.js/inventory.min.js
 *
 * Uses esbuild to bundle ESM sources into browser-compatible IIFE formats.
 */

import { build } from 'esbuild';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

async function runBuild() {
  const finderEntryPoint = join(repoRoot, 'src', 'element-finder.js');
  const inventoryEntryPoint = join(repoRoot, 'src', 'element-inventory.js');

  try {
    // 1. Build the unminified IIFE bundle for element-finder
    await build({
      entryPoints: [finderEntryPoint],
      bundle: true,
      outfile: join(repoRoot, 'index.js'),
      format: 'iife',
      globalName: 'ElementFinder',
      sourcemap: false,
      minify: false,
      platform: 'browser',
      target: 'es2015',
    });

    // 2. Build the minified IIFE bundle for element-finder
    await build({
      entryPoints: [finderEntryPoint],
      bundle: true,
      outfile: join(repoRoot, 'index.min.js'),
      format: 'iife',
      globalName: 'ElementFinder',
      sourcemap: false,
      minify: true,
      platform: 'browser',
      target: 'es2015',
    });

    // 3. Build the unminified IIFE bundle for element-inventory
    await build({
      entryPoints: [inventoryEntryPoint],
      bundle: true,
      outfile: join(repoRoot, 'inventory.js'),
      format: 'iife',
      globalName: 'ElementInventory',
      sourcemap: false,
      minify: false,
      platform: 'browser',
      target: 'es2015',
    });

    // 4. Build the minified IIFE bundle for element-inventory
    await build({
      entryPoints: [inventoryEntryPoint],
      bundle: true,
      outfile: join(repoRoot, 'inventory.min.js'),
      format: 'iife',
      globalName: 'ElementInventory',
      sourcemap: false,
      minify: true,
      platform: 'browser',
      target: 'es2015',
    });

    console.log('✓ Built index.js, index.min.js, inventory.js, and inventory.min.js using esbuild');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();