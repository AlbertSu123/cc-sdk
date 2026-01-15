import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { config } from "../config.ts";

export async function authMiddleware(c: Context, next: Next) {
  // Skip auth in development if no keys configured
  if (config.API_KEYS.length === 0 && config.NODE_ENV === "development") {
    return next();
  }

  // Check X-API-Key header first
  let apiKey = c.req.header("X-API-Key");

  // Fall back to Authorization: Bearer token
  if (!apiKey) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.slice(7);
    }
  }

  if (!apiKey) {
    throw new HTTPException(401, {
      message:
        "Missing API key. Provide X-API-Key header or Authorization: Bearer <key>",
    });
  }

  // Validate against configured API keys
  if (!config.API_KEYS.includes(apiKey)) {
    throw new HTTPException(403, {
      message: "Invalid API key",
    });
  }

  // Store validated key prefix in context for logging
  c.set("apiKey", apiKey.slice(0, 8) + "...");

  return next();
}
