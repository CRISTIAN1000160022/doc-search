module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testRegex: ".spec.ts$",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.module.ts",
    "!src/**/*.entity.ts",
    "!src/**/*.dto.ts",
    "!src/main.ts",
    "!src/worker.ts",
    "!src/infrastructure/config/**",
    "!src/infrastructure/events/**",
    "!src/infrastructure/auth/current-user.decorator.ts",
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  coverageDirectory: "coverage",
};