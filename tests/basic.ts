import { prompt, createSession } from "../src/index.ts";

async function testPrompt() {
  console.log("=== Testing one-shot prompt ===\n");

  const result = await prompt("What is 2 + 2? Reply with just the number.");

  console.log("Result:", result.result);
  console.log("Session ID:", result.sessionId);
  console.log("Cost:", result.totalCostUsd);
  console.log("Is Error:", result.isError);
  console.log("");
}

async function testSession() {
  console.log("=== Testing session with streaming ===\n");

  const session = createSession();

  await session.send("Say hello in exactly 3 words.");

  console.log("Streaming events:\n");

  for await (const event of session.stream()) {
    console.log(`[${event.type}]`, JSON.stringify(event, null, 2).slice(0, 200) + "...");
  }

  console.log("\nSession ID:", session.getSessionId());
  session.close();
}

async function testSessionFiltered() {
  console.log("\n=== Testing session with filtered streaming ===\n");

  const session = createSession();

  await session.send("What is the capital of France? Reply briefly.");

  console.log("Filtered events (assistant text + tool_use + result only):\n");

  for await (const event of session.stream({ filter: true })) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          console.log("TEXT:", block.text);
        } else if (block.type === "tool_use") {
          console.log("TOOL:", block.name, block.input);
        }
      }
    } else if (event.type === "result") {
      console.log("RESULT:", event.subtype);
    }
  }

  session.close();
}

async function main() {
  try {
    await testPrompt();
    await testSession();
    await testSessionFiltered();
    console.log("\n=== All basic tests passed ===");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
