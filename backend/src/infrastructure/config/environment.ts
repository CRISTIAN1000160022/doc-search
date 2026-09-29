export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    "JWT_SECRET",
    "JWT_DEMO_USERNAME",
    "JWT_DEMO_PASSWORD",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "REDIS_HOST",
    "ELASTICSEARCH_NODE",
  ];
  const missing = required.filter((key) => typeof config[key] !== "string" || config[key] === "");
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (String(config.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  return config;
}