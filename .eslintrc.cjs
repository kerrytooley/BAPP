/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // Allow underscore-prefixed parameters (used as "intentionally unused" markers)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: [
        '**/tests/**/*.{ts,tsx}',
        '**/features/**/*.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        '**/*.steps.{ts,tsx}',
      ],
      env: { jest: true },
      rules: {
        // require() inside jest.mock factories is idiomatic and hoisted
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/.expo/**'],
};
