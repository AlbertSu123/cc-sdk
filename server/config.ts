import "dotenv/config";

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // API keys (comma-separated in .env)
  API_KEYS: (process.env.API_KEYS || "").split(",").filter(Boolean),

  // CORS origins (comma-separated)
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "").split(",").filter(Boolean),

  // Session settings
  SESSION_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS || "1800000", 10), // 30 min

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

// Validate required config
if (config.API_KEYS.length === 0 && config.NODE_ENV === "production") {
  console.error(
    "WARNING: No API_KEYS configured. All requests will be rejected."
  );
}
