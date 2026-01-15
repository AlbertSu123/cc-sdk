import { Hono } from "hono";

const healthRoutes = new Hono();

healthRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "cc-sdk-api",
    version: "0.1.0",
  });
});

export { healthRoutes };
