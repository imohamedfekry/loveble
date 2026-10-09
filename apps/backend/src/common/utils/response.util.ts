import { ApiResponse } from './types';

/**
 * Canonical response helpers — single source of truth.
 *
 * Signature is ALWAYS (msg, data):
 *   success(RESPONSE_MESSAGES.PROJECT.FETCH_SUCCESS, { files })
 *   throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND))
 *
 * Do NOT use ApiResponseHelper (deprecated shim, opposite arg order).
 */

export type ResponseMsg = { code: string; message: string };

export function success<T>(msg: ResponseMsg, data?: T): ApiResponse<T> {
  return {
    success: true,
    code: msg.code,
    message: msg.message,
    data,
  };
}

export function fail<T = undefined>(
  msg: ResponseMsg,
  extra?: Partial<ApiResponse<T>>,
): ApiResponse<T> {
  return {
    success: false,
    code: msg.code,
    message: msg.message,
    ...(extra as any),
  } as ApiResponse<T>;
}

export function error(
  msg: ResponseMsg,
  extra?: Partial<ApiResponse>,
): ApiResponse<undefined> {
  return {
    success: false,
    code: msg.code,
    message: msg.message,
    ...extra,
  };
}

export function isApiResponse(value: unknown): value is ApiResponse<any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'message' in value
  );
}
