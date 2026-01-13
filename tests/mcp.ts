import { createSession } from "../src/index.ts";
import { resolve } from "path";

async function testMcpListTools() {
  console.log("=== Testing MCP: List available tools ===\n");

  const mcpServerPath = resolve(import.meta.dir, "../mcp-servers/nano-banana-pro/index.ts");

  const session = createSession({
    mcpServers: {
      "nano-banana": {
        command: "npx",
        args: ["-y", "tsx", mcpServerPath],
        env: { GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "" }
      }
    },
    verbose: true,
  });

  await session.send("List all available MCP tools. What tools do you have access to?");

  for await (const event of session.stream({ filter: true })) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          console.log("TEXT:", block.text);
        } else if (block.type === "tool_use") {
          console.log("TOOL:", block.name, JSON.stringify(block.input));
        }
      }
    } else if (event.type === "result") {
      console.log("RESULT:", event.subtype);
    }
  }

  session.close();
}

testMcpListTools().catch(console.error);
