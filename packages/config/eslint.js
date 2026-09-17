module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
  },
};