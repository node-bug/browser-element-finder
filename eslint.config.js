import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },

  // 1. Standard JS rules
  js.configs.recommended,

  // 2. General environment settings
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
      },
    },
  },

  prettierConfig,
]
