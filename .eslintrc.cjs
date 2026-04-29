/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  globals: {
    window: 'readonly',
    document: 'readonly',
    require: 'readonly',
    process: 'readonly',
    __dirname: 'readonly',
    module: 'readonly',
    exports: 'writable',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'warn',
  },
  overrides: [
    {
      files: ['src/renderer/**/*.js'],
      env: { browser: true, node: false },
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    {
      files: ['src/main/**/*.js', 'scripts/**/*.js'],
      env: { node: true, browser: false },
    },
    {
      files: [
        'src/renderer/js/employees/**/*.js',
        'src/renderer/js/utils/**/*.js',
        'src/renderer/js/icons.js',
      ],
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'dist2/',
    'dist3/',
    'dist4/',
    'build/',
    'out/',
    '*.min.js',
  ],
};
