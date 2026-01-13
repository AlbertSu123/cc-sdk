// Main exports
export { Session, createSession, resumeSession } from "./session.ts";
export { prompt } from "./prompt.ts";
export { DEFAULT_MODEL } from "./types.ts";

// Type exports
export type {
  // Events
  SDKEvent,
  SystemInitEvent,
  AssistantEvent,
  UserEvent,
  ResultEvent,
  ResultSuccessEvent,
  ResultErrorEvent,
  // Content blocks
  ContentBlock,
  ThinkingBlock,
  TextBlock,
  ToolUseBlock,
  // Messages
  AssistantMessage,
  ToolResultContent,
  // Options
  SessionOptions,
  StreamOptions,
  PromptResult,
} from "./types.ts";
