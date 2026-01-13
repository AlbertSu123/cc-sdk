import { createSession } from "../src/index.ts";

async function testListFiles() {
  console.log("=== Testing file listing with Bash tool ===\n");

  const session = createSession();

  await session.send("List all files in the current directory. Just run ls.");

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
      console.log("RESULT:", event.subtype, "-", event.result);
    }
  }

  session.close();
}

async function testWebSearch() {
  console.log("\n=== Testing web search ===\n");

  const session = createSession();

  await session.send("Search the web for the current weather in Tokyo. Give me a brief summary.");

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

async function main() {
  try {
    await testListFiles();
    await testWebSearch();
    console.log("\n=== All tools tests passed ===");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
