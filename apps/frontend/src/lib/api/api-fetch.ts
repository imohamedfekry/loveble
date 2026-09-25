import type { ApiResponse, ApiSuccess } from "@loveble/types/envelope";

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL as string | undefined) ??
  "http://localhost:3001/api/v1";
const DEFAULT_TIMEOUT = 15000; // 15 seconds

export async function apiFetch<T>(
    input: RequestInfo,
    init?: RequestInit,
): Promise<ApiSuccess<T>> {

    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(), 
        DEFAULT_TIMEOUT
    );

    try {
        const res = await fetch(`${API_BASE_URL}${input}`, {
            credentials: "include",
            ...init,
            signal: controller.signal,
        });

        if (!res.ok) {
            const contentType = res.headers.get('content-type');
            let body: { message?: string } = { message: `HTTP ${res.status}: ${res.statusText}` };
            
            if (contentType?.includes('application/json')) {
                try {
                    body = await res.json() as { message?: string };
                } catch {
                    // ignore json parse error
                }
            }

            throw new Error(body?.message || `Request failed with status ${res.status}`);
        }

        const body = await res.json() as ApiResponse<T>;

        if (!body.success) {
            body.errors?.forEach(({ field, message }) => {
                console.error(`[apiFetch] ${field}: ${message}`);
            });
            throw new Error(body.message || 'API request failed');
        }

        return body;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}