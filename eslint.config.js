import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.min.js', 'index.js'],
  },

  // 1. Standard JS rules
  js.configs.recommended,

  // 2. General environment settings
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        // Enforces support for the 'with' and 'assert' stage structures
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
    },
  },

  prettierConfig,
]
