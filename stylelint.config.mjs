const TAILWIND_AT_RULES = [
  'tailwind',
  'theme',
  'plugin',
  'apply',
  'utility',
  'variant',
  'custom-variant',
  'source',
  'config',
  'reference',
];

export default {
  extends: ['stylelint-config-standard'],
  plugins: ['./tooling/lint/no-comments-stylelint-plugin.mjs'],
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  overrides: [
    {
      files: ['**/*.astro'],
      customSyntax: 'postcss-html',
      rules: { 'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }] },
    },
  ],
  rules: {
    'local/no-comments': true,
    'at-rule-no-unknown': [true, { ignoreAtRules: TAILWIND_AT_RULES }],
    'import-notation': 'string',
  },
};
