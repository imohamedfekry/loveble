import type { ApiResponse, ApiSuccess } from "./response.types";

const API_BASE_URL = 'http://localhost:3001/api/v1'
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
        console.log(`[apiFetch] Starting request: ${input}`);
        
        const res = await fetch(`${API_BASE_URL}${input}`, {
            credentials: "include",
            ...init,
            signal: controller.signal,
        });

        console.log(`[apiFetch] Response status ${res.status} for: ${input}`);

        if (!res.ok) {
            const contentType = res.headers.get('content-type');
            let body: any = { message: `HTTP ${res.status}: ${res.statusText}` };
            
            if (contentType?.includes('application/json')) {
                try {
                    body = await res.json();
                } catch {
                    // ignore json parse error
                }
            }

            console.error(`[apiFetch] HTTP Error ${res.status} for ${input}:`, body);
            throw new Error(body?.message || `Request failed with status ${res.status}`);
        }

        const body = await res.json() as ApiResponse<T>;
        
        console.log(`[apiFetch] Success for ${input}, data present:`, !!body.data);

        if (!body.success) {
            body.errors?.forEach(({ field, message }) => {
                console.error(`[apiFetch] ${field}: ${message}`);
            });
            throw new Error(body.message || 'API request failed');
        }

        return body;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[apiFetch] Request timeout (${DEFAULT_TIMEOUT}ms) for: ${input}`);
            throw new Error(`Request timeout`);
        }
        console.error(`[apiFetch] Error for ${input}:`, error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}