import { validateEnvironment } from "./environment";

const completeConfig = {
  JWT_SECRET: "this-is-a-long-enough-test-secret-value",
  JWT_DEMO_USERNAME: "demo",
  JWT_DEMO_PASSWORD: "password",
  POSTGRES_DB: "docsearch",
  POSTGRES_USER: "docsearch",
  POSTGRES_PASSWORD: "password",
  POSTGRES_PORT: "5432",
  REDIS_HOST: "redis",
  ELASTICSEARCH_NODE: "http://elastic:9200",
};

describe("validateEnvironment", () => {
  it("accepts a complete environment and returns it unchanged", () => {
    expect(validateEnvironment(completeConfig)).toBe(completeConfig);
  });

  it("names missing required variables", () => {
    expect(() => validateEnvironment({})).toThrow("JWT_SECRET");
    expect(() => validateEnvironment({ ...completeConfig, REDIS_HOST: undefined })).toThrow("REDIS_HOST");
  });

  it("rejects a JWT secret shorter than 32 characters", () => {
    expect(() => validateEnvironment({ ...completeConfig, JWT_SECRET: "short" })).toThrow("at least 32 characters");
  });
});