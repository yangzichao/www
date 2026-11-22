import js from '@eslint/js';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import eslintReact from '@eslint-react/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import localNoComments from './tooling/lint/no-comments-eslint-plugin.mjs';

const TYPE_AWARE_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts'];
const REACT_FILES = ['src/**/*.tsx', 'tests/**/*.tsx'];
const BROWSER_SCRIPT_FILES = ['src/scripts/**/*.ts', 'src/features/*/components/**/*.{ts,tsx}'];
const NODE_FILES = ['*.{js,mjs,ts}', 'tooling/**/*.mjs', 'tests/e2e/**/*.ts', 'tests/support/node/**/*.ts'];
const VITEST_FILES = ['tests/{unit,components,workers}/**/*.{ts,tsx}'];

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    '.wrangler/',
    '.claude/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'public/',
    'notes/',
    'prompts/',
    'skills/',
    'worker-configuration.d.ts',
  ]),
  {
    linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' },
  },
  js.configs.recommended,
  eslintComments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: ['eslint-enable'] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
    },
  },
  {
    files: TYPE_AWARE_FILES,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-strict'],
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] },
    },
  },
  {
    files: REACT_FILES,
    extends: [eslintReact.configs['strict-type-checked'], reactHooks.configs.flat.recommended, jsxA11y.configs.strict],
  },
  {
    files: BROWSER_SCRIPT_FILES,
    languageOptions: { globals: globals.browser },
  },
  {
    files: NODE_FILES,
    languageOptions: { globals: globals.node },
  },
  {
    files: VITEST_FILES,
    extends: [vitest.configs.all],
    settings: { vitest: { typecheck: true } },
    rules: {
      'vitest/prefer-expect-assertions': 'off',
      'vitest/no-hooks': 'off',
      'vitest/require-hook': 'off',
      'vitest/prefer-describe-function-title': 'off',
      'vitest/prefer-importing-vitest-globals': 'error',
      'vitest/require-mock-type-parameters': 'off',
      'vitest/prefer-to-be-truthy': 'off',
      'vitest/prefer-to-be-falsy': 'off',
      'vitest/max-expects': 'off',
      'vitest/prefer-lowercase-title': 'off',
    },
  },
  {
    files: ['tests/components/setup-testing-library.ts'],
    rules: { 'vitest/require-top-level-describe': 'off' },
  },
  {
    plugins: { local: localNoComments },
    rules: { 'local/no-comments': 'error' },
  },
  eslintConfigPrettier,
);
