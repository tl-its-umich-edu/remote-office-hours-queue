module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/setupTests.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testMatch: [
    "<rootDir>/assets/src/**/__tests__/**/*.(ts|tsx)",
    "<rootDir>/assets/src/**/*.(test|spec).(ts|tsx)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "assets/src/**/*.(ts|tsx)",
    "!assets/src/**/*.d.ts",
    "!assets/src/index.tsx",
  ],
};
