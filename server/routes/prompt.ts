import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prompt, createSession } from "../../src/index.ts";
import { streamSessionEvents } from "../services/sse-stream.ts";
import type { SessionOptions, MCPServerConfig, AgentConfig } from "../../src/types.ts";

const promptRoutes = new Hono();

interface PromptRequest {
  message: string;
  model?: string;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  cwd?: string;
  mcpServers?: Record<string, MCPServerConfig>;
  agents?: Record<string, AgentConfig>;
  chrome?: boolean;
}

// POST /prompt - One-shot, non-streaming
promptRoutes.post("/", async (c) => {
  const body = await c.req.json<PromptRequest>();

  if (!body.message) {
    throw new HTTPException(400, { message: "message is required" });
  }

  const options: SessionOptions = {
    model: body.model,
    systemPrompt: body.systemPrompt,
    appendSystemPrompt: body.appendSystemPrompt,
    cwd: body.cwd,
    mcpServers: body.mcpServers,
    agents: body.agents,
    chrome: body.chrome,
  };

  console.log(`[Prompt] Processing: "${body.message.slice(0, 50)}..."`);

  const result = await prompt(body.message, options);

  return c.json(result);
});

// POST /prompt/stream - One-shot with SSE streaming
promptRoutes.post("/stream", async (c) => {
  const body = await c.req.json<PromptRequest>();

  if (!body.message) {
    throw new HTTPException(400, { message: "message is required" });
  }

  const options: SessionOptions = {
    model: body.model,
    systemPrompt: body.systemPrompt,
    appendSystemPrompt: body.appendSystemPrompt,
    cwd: body.cwd,
    mcpServers: body.mcpServers,
    agents: body.agents,
    chrome: body.chrome,
  };

  console.log(`[Prompt Stream] Processing: "${body.message.slice(0, 50)}..."`);

  const session = createSession(options);
  await session.send(body.message);

  return streamSessionEvents(c, session);
});

export { promptRoutes };
