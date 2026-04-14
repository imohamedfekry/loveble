import { ApiResponse } from '../utils/types';

export type Msg = { code: string; message: string };

export const ApiResponseHelper = {
  success<T>(
    msg: Msg,
    data?: T,
    extra?: Partial<ApiResponse<T>>,
  ): ApiResponse<T> {
    return {
      status: 'success',
      code: msg.code,
      message: msg.message,
      data,
      ...extra,
    } as ApiResponse<T>;
  },

  fail<T = undefined>(
    msg: Msg,
    extra?: Partial<ApiResponse<T>>,
  ): ApiResponse<T> {
    return {
      status: 'fail',
      code: msg.code,
      message: msg.message,
      ...(extra as any),
    } as ApiResponse<T>;
  },

  error<T = undefined>(
    msg: Msg,
    extra?: Partial<ApiResponse<T>>,
  ): ApiResponse<T> {
    return {
      status: 'error',
      code: msg.code,
      message: msg.message,
      ...(extra as any),
    } as ApiResponse<T>;
  },
};
