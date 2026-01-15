import type {
  RetryOptions,
  ClassifiedError,
  RetryableErrorType,
  PromptResult,
  SessionOptions,
} from "./types.ts";
import { DEFAULT_RETRY_OPTIONS } from "./types.ts";
import { prompt as basePrompt } from "./prompt.ts";

/**
 * Classifies an error message to determine if it's retryable
 */
export function classifyError(
  errorMessage: string,
  retryablePatterns: string[] = DEFAULT_RETRY_OPTIONS.retryableErrors
): ClassifiedError {
  const lowerError = errorMessage.toLowerCase();

  // Check for rate limit indicators
  if (
    lowerError.includes("rate limit") ||
    lowerError.includes("rate_limit") ||
    lowerError.includes("429") ||
    lowerError.includes("too many requests")
  ) {
    return {
      isRetryable: true,
      errorType: "rate_limit",
      retryAfterMs: extractRetryAfter(errorMessage),
      originalError: errorMessage,
    };
  }

  // Check for overloaded/capacity issues
  if (
    lowerError.includes("overloaded") ||
    lowerError.includes("capacity") ||
    lowerError.includes("503") ||
    lowerError.includes("service unavailable")
  ) {
    return {
      isRetryable: true,
      errorType: "overloaded",
      retryAfterMs: extractRetryAfter(errorMessage),
      originalError: errorMessage,
    };
  }

  // Check for usage/quota limits (these may or may not be retryable)
  if (
    lowerError.includes("quota exceeded") ||
    lowerError.includes("usage limit") ||
    lowerError.includes("credit") ||
    lowerError.includes("billing")
  ) {
    return {
      isRetryable: false, // Usage limits typically require user action
      errorType: "usage_limit",
      originalError: errorMessage,
    };
  }

  // Check against custom retryable patterns
  const isRetryable = retryablePatterns.some((pattern) =>
    lowerError.includes(pattern.toLowerCase())
  );

  return {
    isRetryable,
    errorType: "unknown",
    originalError: errorMessage,
  };
}

/**
 * Extracts retry-after value from error message if present
 */
function extractRetryAfter(errorMessage: string): number | undefined {
  // Look for patterns like "retry after 30 seconds" or "retry-after: 30"
  const patterns = [
    /retry[- ]?after[:\s]+(\d+)\s*(?:seconds?|s)?/i,
    /wait[:\s]+(\d+)\s*(?:seconds?|s)?/i,
    /(\d+)\s*(?:seconds?|s)\s*(?:before|until)/i,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10) * 1000; // Convert to milliseconds
    }
  }

  return undefined;
}

/**
 * Calculates delay for exponential backoff
 */
export function calculateBackoff(
  attempt: number,
  options: Required<RetryOptions>,
  retryAfterMs?: number
): number {
  // If server specified retry-after, use that (with some jitter)
  if (retryAfterMs) {
    const jitter = Math.random() * 1000;
    return Math.min(retryAfterMs + jitter, options.maxDelayMs);
  }

  // Exponential backoff with jitter
  const exponentialDelay =
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const jitter = Math.random() * options.initialDelayMs;
  return Math.min(exponentialDelay + jitter, options.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryState {
  attempt: number;
  lastError?: ClassifiedError;
  totalDelayMs: number;
}

export interface PromptWithRetryResult extends PromptResult {
  retryState?: RetryState;
}

/**
 * Executes a prompt with automatic retry on retryable errors
 */
export async function promptWithRetry(
  message: string,
  options: SessionOptions & { retry?: RetryOptions } = {}
): Promise<PromptWithRetryResult> {
  const retryOptions: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options.retry,
  };

  const retryState: RetryState = {
    attempt: 0,
    totalDelayMs: 0,
  };

  while (true) {
    try {
      const result = await basePrompt(message, options);

      // Check if result contains retryable errors
      if (result.isError && result.errors && result.errors.length > 0) {
        const classifiedErrors = result.errors.map((err) =>
          classifyError(err, retryOptions.retryableErrors)
        );

        const retryableError = classifiedErrors.find((e) => e.isRetryable);

        if (retryableError && retryState.attempt < retryOptions.maxRetries) {
          retryState.lastError = retryableError;
          retryState.attempt++;

          const delayMs = calculateBackoff(
            retryState.attempt,
            retryOptions,
            retryableError.retryAfterMs
          );
          retryState.totalDelayMs += delayMs;

          if (options.verbose) {
            console.log(
              `[cc-sdk] Retryable error detected: ${retryableError.errorType}. ` +
                `Retry ${retryState.attempt}/${retryOptions.maxRetries} after ${delayMs}ms`
            );
          }

          await sleep(delayMs);
          continue;
        }
      }

      // Return result with retry state
      return {
        ...result,
        retryState: retryState.attempt > 0 ? retryState : undefined,
      };
    } catch (error) {
      // Handle thrown errors (not result errors)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const classified = classifyError(errorMessage, retryOptions.retryableErrors);

      if (classified.isRetryable && retryState.attempt < retryOptions.maxRetries) {
        retryState.lastError = classified;
        retryState.attempt++;

        const delayMs = calculateBackoff(
          retryState.attempt,
          retryOptions,
          classified.retryAfterMs
        );
        retryState.totalDelayMs += delayMs;

        if (options.verbose) {
          console.log(
            `[cc-sdk] Retryable exception: ${classified.errorType}. ` +
              `Retry ${retryState.attempt}/${retryOptions.maxRetries} after ${delayMs}ms`
          );
        }

        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }
}

/**
 * Check if errors indicate a usage/billing limit that requires user action
 */
export function isUsageLimitError(errors: string[]): boolean {
  return errors.some((err) => {
    const classified = classifyError(err);
    return classified.errorType === "usage_limit";
  });
}

/**
 * Check if errors are retryable
 */
export function hasRetryableError(
  errors: string[],
  retryablePatterns?: string[]
): boolean {
  return errors.some((err) => {
    const classified = classifyError(err, retryablePatterns);
    return classified.isRetryable;
  });
}
