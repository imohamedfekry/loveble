import type { ApiResponse, ApiSuccess } from "./response.types";

const API_BASE_URL = 'http://localhost:3001/api/v1'

export async function apiFetch<T>(
    input: RequestInfo,
    init?: RequestInit,
): Promise<ApiSuccess<T>> {

    const res = await fetch(`${API_BASE_URL}${input}`, {
        credentials: "include",
        ...init,
    });

    const body = await res.json() as ApiResponse<T>;
    console.log("resbonse",body);
    
    if (!body.success) {
        body.errors?.forEach(({ field, message }) => {
            console.error(`${field}: ${message}`);
        });
        throw new Error(body.message);
    }
    return body;
}