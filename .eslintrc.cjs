/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  ignorePatterns: ["!**/.server", "!**/.client"],
  extends: [
    "eslint:recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  rules: {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-unused-vars": "off", // Turn off base rule as it can report incorrect errors
    "@typescript-eslint/no-explicit-any": "off", // Allow any types for browser APIs and complex integrations
    "@typescript-eslint/no-non-null-assertion": "warn", // Reduce from error to warning
  },
  globals: {
    shopify: "readonly"
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      extends: [
        "plugin:@typescript-eslint/recommended",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "off", // Allow any types for browser APIs
        "@typescript-eslint/no-non-null-assertion": "warn",
      },
    },
    {
      files: [".eslintrc.cjs"],
      env: {
        node: true,
      },
    },
  ],
};
