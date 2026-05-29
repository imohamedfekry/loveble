import { APICallError } from "@ai-sdk/provider";

export type ProviderFallbackDecision =
  | {
      kind: "permanent";
      reason:
        | "insufficient_balance"
        | "quota_exceeded"
        | "billing_suspended";
      statusCode?: number;
      message: string;
    }
  | {
      kind: "transient";
      reason: "rate_limited" | "provider_unavailable" | "network";
      statusCode?: number;
      message: string;
    }
  | {
      kind: "unknown";
      message: string;
    };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Minimal, provider-agnostic classification for when to fallback vs stop retries.
 * We keep it conservative: only mark "permanent" when we are confident (billing/quota).
 */
export function classifyProviderError(
  error: unknown,
): ProviderFallbackDecision {
  const message = toMessage(error);

  // ai-sdk exposes a structured APICallError in many cases
  const statusCode =
    APICallError.isInstance(error) ? error.statusCode : undefined;

  // Permanent: billing / quota style failures (don't retry)
  if (
    /insufficient balance/i.test(message) ||
    /recharge your account/i.test(message)
  ) {
    return {
      kind: "permanent",
      reason: "insufficient_balance",
      statusCode,
      message,
    };
  }

  if (/quota exceeded/i.test(message)) {
    return {
      kind: "permanent",
      reason: "quota_exceeded",
      statusCode,
      message,
    };
  }

  if (/suspended/i.test(message) && /billing|balance/i.test(message)) {
    return {
      kind: "permanent",
      reason: "billing_suspended",
      statusCode,
      message,
    };
  }

  // Transient: rate limit or provider availability
  if (statusCode === 429 || /rate limit|too many requests/i.test(message)) {
    return {
      kind: "transient",
      reason: "rate_limited",
      statusCode,
      message,
    };
  }

  if (
    statusCode === 503 ||
    statusCode === 502 ||
    statusCode === 504 ||
    /service unavailable|temporarily unavailable|provider unavailable/i.test(
      message,
    )
  ) {
    return {
      kind: "transient",
      reason: "provider_unavailable",
      statusCode,
      message,
    };
  }

  // Typical network/TLS errors should be treated as transient
  if (
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|unable to verify|certificate|TLS/i.test(
      message,
    )
  ) {
    return {
      kind: "transient",
      reason: "network",
      statusCode,
      message,
    };
  }

  return { kind: "unknown", message };
}

export function shouldFallbackOn(
  decision: ProviderFallbackDecision,
): boolean {
  return decision.kind === "transient" || decision.kind === "permanent";
}

