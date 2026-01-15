import { serve } from "@hono/node-server";
import { app } from "./app.ts";
import { config } from "./config.ts";
import { sessionManager } from "./services/session-manager.ts";

const port = config.PORT;

console.log(`
╔═══════════════════════════════════════════════════╗
║                 cc-sdk API Server                 ║
╠═══════════════════════════════════════════════════╣
║  Environment: ${config.NODE_ENV.padEnd(35)}║
║  Port: ${port.toString().padEnd(42)}║
║  API Keys: ${config.API_KEYS.length > 0 ? `${config.API_KEYS.length} configured` : "none (dev mode)".padEnd(38)}║
╚═══════════════════════════════════════════════════╝
`);

const server = serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Health check: http://localhost:${port}/api/v1/health`);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, shutting down gracefully...");
  sessionManager.shutdown();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, shutting down gracefully...");
  sessionManager.shutdown();
  process.exit(0);
});

export { server };
