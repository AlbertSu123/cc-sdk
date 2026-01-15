import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sessionManager } from "../services/session-manager.ts";
import { streamSessionEvents } from "../services/sse-stream.ts";
import type { SessionOptions, SDKEvent } from "../../src/types.ts";

const sessionRoutes = new Hono();

// POST /sessions - Create new session
sessionRoutes.post("/", async (c) => {
  const body = await c.req.json<SessionOptions>();

  const internalId = sessionManager.create(body);

  console.log(`[Sessions] Created session: ${internalId}`);

  return c.json(
    {
      sessionId: internalId,
      status: "created",
      createdAt: new Date().toISOString(),
    },
    201
  );
});

// GET /sessions - List active sessions
sessionRoutes.get("/", (c) => {
  const sessions = sessionManager.list();
  return c.json({ sessions });
});

// GET /sessions/:sessionId - Get session details
sessionRoutes.get("/:sessionId", (c) => {
  const { sessionId } = c.req.param();
  const managed = sessionManager.get(sessionId);

  if (!managed) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  return c.json({
    sessionId,
    cliSessionId: managed.cliSessionId,
    status: managed.status,
    createdAt: managed.createdAt.toISOString(),
    lastActivity: managed.lastActivity.toISOString(),
  });
});

// DELETE /sessions/:sessionId - Close session
sessionRoutes.delete("/:sessionId", (c) => {
  const { sessionId } = c.req.param();
  const closed = sessionManager.close(sessionId);

  if (!closed) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  console.log(`[Sessions] Closed session: ${sessionId}`);

  return c.json({ message: "Session closed", sessionId });
});

// POST /sessions/:sessionId/messages - Send message (non-streaming)
sessionRoutes.post("/:sessionId/messages", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json<{ message: string; filter?: boolean }>();

  if (!body.message) {
    throw new HTTPException(400, { message: "message is required" });
  }

  const managed = sessionManager.get(sessionId);
  if (!managed) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  if (managed.status === "busy") {
    throw new HTTPException(409, {
      message: "Session is busy processing another request",
    });
  }

  sessionManager.setStatus(sessionId, "busy");

  console.log(
    `[Sessions] Message to ${sessionId}: "${body.message.slice(0, 50)}..."`
  );

  try {
    await managed.session.send(body.message);

    const events: SDKEvent[] = [];
    let result: string | undefined;
    let isError = false;

    for await (const event of managed.session.stream({ filter: body.filter })) {
      events.push(event);

      // Capture CLI session ID from init event
      if (event.type === "system" && event.subtype === "init") {
        sessionManager.updateCliSessionId(sessionId, event.session_id);
      }

      if (event.type === "result") {
        isError = event.is_error;
        if (event.subtype === "success") {
          result = event.result;
        }
      }
    }

    return c.json({
      sessionId,
      cliSessionId: managed.cliSessionId,
      events,
      result,
      isError,
    });
  } finally {
    sessionManager.setStatus(sessionId, "idle");
  }
});

// POST /sessions/:sessionId/messages/stream - Send message with SSE
sessionRoutes.post("/:sessionId/messages/stream", async (c) => {
  const { sessionId } = c.req.param();
  const body = await c.req.json<{ message: string; filter?: boolean }>();

  if (!body.message) {
    throw new HTTPException(400, { message: "message is required" });
  }

  const managed = sessionManager.get(sessionId);
  if (!managed) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  if (managed.status === "busy") {
    throw new HTTPException(409, {
      message: "Session is busy processing another request",
    });
  }

  sessionManager.setStatus(sessionId, "busy");

  console.log(
    `[Sessions Stream] Message to ${sessionId}: "${body.message.slice(0, 50)}..."`
  );

  await managed.session.send(body.message);

  // Create a wrapper that resets status when done
  const response = await streamSessionEvents(c, managed.session, {
    filter: body.filter,
  });

  // Note: We need to reset status after streaming completes
  // This is handled in the finally block of the stream
  sessionManager.setStatus(sessionId, "idle");

  return response;
});

// POST /sessions/resume - Resume an existing CLI session
sessionRoutes.post("/resume", async (c) => {
  const body = await c.req.json<{ cliSessionId: string } & SessionOptions>();

  if (!body.cliSessionId) {
    throw new HTTPException(400, { message: "cliSessionId is required" });
  }

  const { cliSessionId, ...options } = body;
  const internalId = sessionManager.resume(cliSessionId, options);

  console.log(
    `[Sessions] Resumed CLI session ${cliSessionId} as ${internalId}`
  );

  return c.json(
    {
      sessionId: internalId,
      cliSessionId,
      status: "resumed",
      createdAt: new Date().toISOString(),
    },
    201
  );
});

export { sessionRoutes };
