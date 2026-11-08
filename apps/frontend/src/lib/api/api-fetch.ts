import type {
    ApiFailure,
    ApiResponse,
    ApiSuccess,
    ApiValidationError,
} from "@loveble/types/envelope";

import { API_BASE_URL } from "../api";

export { API_BASE_URL } from "../api";

const DEFAULT_TIMEOUT = 15000; // 15 seconds

export type ApiRequestOptions = { timeoutMs?: number };

/**
 * Normalized transport error. Every failed request throws one of these, so
 * callers never have to inspect `res.ok`, parse bodies, or guess the shape
 * of a backend error.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly code?: string;
    readonly errors?: ApiValidationError[];

    constructor(
        message: string,
        status: number,
        code?: string,
        errors?: ApiValidationError[],
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.errors = errors;
    }
}

function isApiFailure(body: unknown): body is ApiFailure {
    return (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        (body as { success?: unknown }).success !== true
    );
}

/**
 * The single place that talks to the API: URL join, credentials, timeout,
 * abort linking, JSON parsing and error normalization.
 *
 * Returns the parsed JSON body untouched — use it for endpoints whose
 * envelope differs from `ApiSuccess<T>`, and `apiFetch` when the canonical
 * envelope is expected.
 */
export async function apiRequest<T>(
    path: string,
    init?: RequestInit,
    options?: ApiRequestOptions,
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        options?.timeoutMs ?? DEFAULT_TIMEOUT,
    );

    const externalSignal = init?.signal;
    const abortFromExternal = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener("abort", abortFromExternal);
        }
    }

    try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
            credentials: "include",
            ...init,
            signal: controller.signal,
        });

        const contentType = res.headers.get("content-type");
        const body = contentType?.includes("application/json")
            ? await res.json().catch(() => null)
            : null;

        if (!res.ok) {
            const failure = isApiFailure(body) ? body : null;
            throw new ApiError(
                failure?.message || `HTTP ${res.status}: ${res.statusText}`,
                res.status,
                failure?.code,
                failure?.errors,
            );
        }

        if (body === null) {
            throw new ApiError(`Invalid response from ${path}`, res.status);
        }

        return body as T;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new ApiError("Request timeout", 0);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener("abort", abortFromExternal);
    }
}

/**
 * Canonical envelope endpoints: resolves with `ApiSuccess<T>` and throws
 * `ApiError` when the envelope reports failure.
 */
export async function apiFetch<T>(
    path: string,
    init?: RequestInit,
    options?: ApiRequestOptions,
): Promise<ApiSuccess<T>> {
    const body = await apiRequest<ApiResponse<T>>(path, init, options);

    if (!body || body.success !== true) {
        body?.errors?.forEach(({ field, message }) => {
            console.error(`[apiFetch] ${field}: ${message}`);
        });
        throw new ApiError(
            body?.message || "API request failed",
            200,
            body?.code,
            body?.errors,
        );
    }

    return body;
}
