// Main exports
export { Session, createSession, resumeSession } from "./session.ts";
export { prompt } from "./prompt.ts";
export { DEFAULT_MODEL, DEFAULT_RETRY_OPTIONS } from "./types.ts";

// Retry utilities
export {
  promptWithRetry,
  classifyError,
  calculateBackoff,
  isUsageLimitError,
  hasRetryableError,
  sleep,
} from "./retry.ts";

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
  // MCP and Agents
  MCPServerConfig,
  AgentConfig,
  // Retry types
  RetryOptions,
  RetryableErrorType,
  ClassifiedError,
} from "./types.ts";

export type { PromptWithRetryResult, RetryState } from "./retry.ts";
