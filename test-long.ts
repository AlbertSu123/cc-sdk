import { createSession } from "./src/index.ts";

async function testLongExecution() {
  console.log("=== Testing longer execution (create dir, write python, run it) ===\n");

  const session = createSession();

  const prompt = `
Do the following steps:
1. Create a directory called "test-output" in the current directory (if it doesn't exist)
2. Write a Python script called "test-output/fibonacci.py" that:
   - Defines a function to calculate the nth fibonacci number
   - Prints the first 10 fibonacci numbers
   - Prints the sum of the first 10 fibonacci numbers
3. Run the Python script and show me the output
4. Tell me what the sum was
`;

  await session.send(prompt);

  for await (const event of session.stream({ filter: true })) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          console.log("\n📝 TEXT:", block.text);
        } else if (block.type === "tool_use") {
          console.log("\n🔧 TOOL:", block.name);
          if (block.name === "Bash") {
            console.log("   Command:", (block.input as any).command);
          } else if (block.name === "Write") {
            console.log("   File:", (block.input as any).file_path);
          }
        }
      }
    } else if (event.type === "result") {
      console.log("\n✅ RESULT:", event.subtype);
      if (event.subtype === "success") {
        console.log("   Final answer:", event.result);
        console.log("   Cost: $" + event.total_cost_usd.toFixed(4));
        console.log("   Turns:", event.num_turns);
      }
    }
  }

  session.close();
}

testLongExecution().catch(console.error);
