module.exports = {
  env: { es6: true, browser: true },
  parser: "typescript-eslint-parser",
  plugins: ["prettier", "typescript"],
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "off",
    "typescript/no-unused-vars": ["error"],
    "prefer-arrow-callback": ["error"]
  }
};
