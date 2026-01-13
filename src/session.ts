import type {
  SessionOptions,
  StreamOptions,
  SDKEvent,
  AssistantEvent,
  ResultEvent,
} from "./types.ts";
import { spawnCLI, streamEvents, type CLIProcess } from "./cli.ts";

export class Session {
  private options: SessionOptions;
  private sessionId: string | null = null;
  private currentProcess: CLIProcess | null = null;
  private pendingMessage: string | null = null;
  private hasStarted = false;

  constructor(options: SessionOptions = {}) {
    this.options = options;
  }

  static resume(sessionId: string, options: SessionOptions = {}): Session {
    const session = new Session(options);
    session.sessionId = sessionId;
    return session;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async send(message: string): Promise<void> {
    if (this.currentProcess) {
      throw new Error(
        "Cannot send while a stream is active. Consume the stream first."
      );
    }
    this.pendingMessage = message;
  }

  async *stream(options: StreamOptions = {}): AsyncGenerator<SDKEvent> {
    if (!this.pendingMessage) {
      throw new Error("No message to send. Call send() first.");
    }

    const message = this.pendingMessage;
    this.pendingMessage = null;

    this.currentProcess = spawnCLI({
      ...this.options,
      prompt: message,
      resumeSessionId: this.hasStarted ? this.sessionId ?? undefined : undefined,
    });

    try {
      for await (const event of streamEvents(this.currentProcess, this.options.verbose)) {
        // Capture session ID from init event
        if (event.type === "system" && event.subtype === "init") {
          this.sessionId = event.session_id;
          this.hasStarted = true;
        }

        // Filter if requested
        if (options.filter) {
          if (this.isFilteredEvent(event)) {
            yield event;
          }
        } else {
          yield event;
        }
      }

      await this.currentProcess.exited;
    } finally {
      this.currentProcess = null;
    }
  }

  private isFilteredEvent(event: SDKEvent): boolean {
    // Include: assistant with text or tool_use, result events
    if (event.type === "result") {
      return true;
    }

    if (event.type === "assistant") {
      const assistantEvent = event as AssistantEvent;
      return assistantEvent.message.content.some(
        (block) => block.type === "text" || block.type === "tool_use"
      );
    }

    return false;
  }

  close(): void {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
  }

  // Support for `await using session = ...`
  [Symbol.asyncDispose](): Promise<void> {
    this.close();
    return Promise.resolve();
  }
}

export function createSession(options: SessionOptions = {}): Session {
  return new Session(options);
}

export function resumeSession(
  sessionId: string,
  options: SessionOptions = {}
): Session {
  return Session.resume(sessionId, options);
}
