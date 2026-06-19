module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/src/**/*.test.ts"],
  moduleNameMapper: {
    "^@qvac/sdk$": "<rootDir>/__mocks__/@qvac/sdk.ts",
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.ts",
    "^expo-file-system/legacy$": "<rootDir>/__mocks__/expo-file-system-legacy.ts",
  },
};
