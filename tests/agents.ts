import { createSession } from "../src/index.ts";

async function testCustomAgents() {
  console.log("=== Testing Custom Subagents ===\n");

  const session = createSession({
    agents: {
      "greeter": {
        description: "A friendly greeter that always starts with 'Howdy!'",
        prompt: "You are a friendly greeter. Always start your responses with 'Howdy!' and be enthusiastic."
      }
    },
    verbose: true,
  });

  await session.send("Use the greeter agent to say hello");

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

testCustomAgents().catch(console.error);
