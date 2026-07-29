import react from 'eslint-plugin-react'
import tsParser from '@typescript-eslint/parser'
import tseslint from 'typescript-eslint'

const jsxNoLiteralsOptions = {
  noStrings: true,
  ignoreProps: true,
  allowedStrings: ['', ' ', ':', '/', '#', '-', '—', '·'],
}

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-no-literals': ['error', jsxNoLiteralsOptions],
    },
  },
]
