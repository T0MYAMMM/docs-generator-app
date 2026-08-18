module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/', 'node_modules/', 'docs/', '*-docs/', 'tests/fixtures/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // `Symbol` here is DocGen's own domain type — a symbol extracted from source
    // code — not the JavaScript global. It is always imported explicitly, so the
    // shadowing is deliberate and scoped.
    '@typescript-eslint/ban-types': [
      'error',
      { types: { Symbol: false }, extendDefaults: true },
    ],
  },
};
