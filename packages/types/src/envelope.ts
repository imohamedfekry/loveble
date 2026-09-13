export interface ApiSuccess<T> {
    success: true;
    code: string;
    message: string;
    data: T;
}

export interface ApiValidationError {
    field: string;
    message: string;
}

export interface ApiFailure {
    success: false;
    code: string;
    message: string;
    data?: unknown;
    errors?: ApiValidationError[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;