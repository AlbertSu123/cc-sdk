import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { SDKEvent, StreamOptions } from "../../src/types.ts";
import type { Session } from "../../src/session.ts";

export async function streamSessionEvents(
  c: Context,
  session: Session,
  options: StreamOptions = {}
): Promise<Response> {
  return streamSSE(c, async (stream) => {
    try {
      for await (const event of session.stream(options)) {
        // Map SDK event types to SSE event names
        const eventName = event.type;

        await stream.writeSSE({
          event: eventName,
          data: JSON.stringify(event),
          id: event.uuid,
        });

        // If this is the result event, we're done
        if (event.type === "result") {
          await stream.writeSSE({
            event: "done",
            data: "[DONE]",
          });
          break;
        }
      }
    } catch (error) {
      console.error("[SSE Stream] Error:", error);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      });
    }
  });
}
