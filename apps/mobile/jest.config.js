/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Pure logic only — no .tsx, so nothing here needs a renderer or native mocks.
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
