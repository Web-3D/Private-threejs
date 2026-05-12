import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // ─── 1. Bỏ qua ────────────────────────────────────────────────────────────
  {
    ignores: ['node_modules/**', '*.config.js'],
  },

  // ─── 2. Cấu hình cơ bản ───────────────────────────────────────────────────
  js.configs.recommended,

  // ─── 3. TypeScript strict — cùng chuẩn với project ───────────────────────
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // ─── Import sort ──────────────────────────────────────────────────────
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // ─── TypeScript strict ────────────────────────────────────────────────
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // ─── Anti-bloat — Rule 50 ─────────────────────────────────────────────
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 10],

      // ─── Prettier ─────────────────────────────────────────────────────────
      'prettier/prettier': 'error',
    },
  },

  // ─── 4. Tắt rules xung đột với Prettier ───────────────────────────────────
  prettierConfig,
]
