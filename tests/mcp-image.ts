import { createSession } from "../src/index.ts";
import { resolve } from "path";

async function testMcpGenerateImage() {
  console.log("=== Testing MCP: Generate image with Nano Banana Pro ===\n");

  if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY environment variable is required");
    console.error("Usage: GOOGLE_API_KEY=your_key bun tests/mcp-image.ts");
    process.exit(1);
  }

  const mcpServerPath = resolve(import.meta.dir, "../mcp-servers/nano-banana-pro/index.ts");

  const session = createSession({
    mcpServers: {
      "nano-banana": {
        command: "npx",
        args: ["-y", "tsx", mcpServerPath],
        env: { GOOGLE_API_KEY: process.env.GOOGLE_API_KEY }
      }
    },
    verbose: true,
  });

  const outputPath = resolve(import.meta.dir, "../generated-image.png");

  await session.send(`Generate an image of a cute robot eating a banana using the nano-banana MCP tool. Save the generated image to ${outputPath}`);

  for await (const event of session.stream({ filter: true })) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          console.log("TEXT:", block.text);
        } else if (block.type === "tool_use") {
          console.log("TOOL:", block.name, JSON.stringify(block.input).slice(0, 200));
        }
      }
    } else if (event.type === "result") {
      console.log("RESULT:", event.subtype);
      if (event.subtype === "success") {
        console.log("Cost: $" + event.total_cost_usd.toFixed(4));
      }
    }
  }

  session.close();
}

testMcpGenerateImage().catch(console.error);
