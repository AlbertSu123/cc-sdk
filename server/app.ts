import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error.ts";
import { healthRoutes, promptRoutes, sessionRoutes } from "./routes/index.ts";
import { config } from "./config.ts";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin:
      config.CORS_ORIGINS.length > 0
        ? config.CORS_ORIGINS
        : ["http://localhost:3000", "https://cc.gudvc.com"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// Health check (no auth required)
app.route("/api/v1/health", healthRoutes);

// Protected routes
app.use("/api/v1/prompt/*", authMiddleware);
app.use("/api/v1/sessions/*", authMiddleware);
app.route("/api/v1/prompt", promptRoutes);
app.route("/api/v1/sessions", sessionRoutes);

// Error handling
app.onError(errorHandler);

// Root redirect
app.get("/", (c) => {
  return c.json({
    name: "cc-sdk-api",
    version: "0.1.0",
    docs: "/api/v1/health",
    endpoints: {
      health: "GET /api/v1/health",
      prompt: "POST /api/v1/prompt",
      promptStream: "POST /api/v1/prompt/stream",
      sessions: "GET|POST /api/v1/sessions",
      session: "GET|DELETE /api/v1/sessions/:id",
      messages: "POST /api/v1/sessions/:id/messages",
      messagesStream: "POST /api/v1/sessions/:id/messages/stream",
      resume: "POST /api/v1/sessions/resume",
    },
  });
});

export { app };
