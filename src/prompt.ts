import type { SessionOptions, PromptResult, ResultEvent } from "./types.ts";
import { createSession } from "./session.ts";

export async function prompt(
  message: string,
  options: SessionOptions = {}
): Promise<PromptResult> {
  const session = createSession(options);

  try {
    await session.send(message);

    let result: ResultEvent | null = null;
    let sessionId: string | null = null;

    for await (const event of session.stream()) {
      if (event.type === "system" && event.subtype === "init") {
        sessionId = event.session_id;
      }

      if (event.type === "result") {
        result = event;
      }
    }

    if (!result) {
      throw new Error("No result event received from CLI");
    }

    if (result.subtype === "success") {
      return {
        result: result.result,
        sessionId: sessionId ?? result.session_id,
        totalCostUsd: result.total_cost_usd,
        usage: {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
        },
        isError: false,
      };
    } else {
      return {
        result: "",
        sessionId: sessionId ?? result.session_id,
        totalCostUsd: result.total_cost_usd,
        usage: {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
        },
        isError: true,
        errors: result.errors,
      };
    }
  } finally {
    session.close();
  }
}
