import type { ApiResponse as ApiResponseType } from '../utils/types';

export const ApiResponseHelper = {
  success<T>(data?: T, message = 'Success'): ApiResponseType<T> {
    return {
      success: true,
      message,
      data,
    };
  },

  error(
    msg: string | { message: string; code: string },
    codeOrExtra?: string | any,
  ): ApiResponseType {
    const message = typeof msg === 'string' ? msg : msg.message;
    const code =
      typeof msg === 'object'
        ? msg.code
        : typeof codeOrExtra === 'string'
        ? codeOrExtra
        : undefined;

    const response: ApiResponseType = {
      success: false,
      message,
      code,
    };

    if (typeof codeOrExtra === 'object' && codeOrExtra !== null) {
      Object.assign(response, codeOrExtra);
    }

    return response;
  },

  fail(
    msg: string | { message: string; code: string },
    extra?: any,
  ): ApiResponseType {
    return this.error(msg, extra);
  },
};

export const ApiResponse = ApiResponseHelper;
