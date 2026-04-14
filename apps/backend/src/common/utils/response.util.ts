import { ApiResponse } from './types';

type Msg = { code: string; message: string };

export function success<T>(msg: Msg, data?: T): ApiResponse<T> {
  return {
    status: 'success',
    code: msg.code,
    message: msg.message,
    data,
  };
}

export function fail<T = undefined>(
  msg: Msg,
  extra?: Partial<ApiResponse<T>>,
): ApiResponse<T> {
  return {
    status: 'fail',
    code: msg.code,
    message: msg.message,
    ...(extra as any),
  } as ApiResponse<T>;
}

export function error(
  msg: Msg,
  extra?: Partial<ApiResponse>,
): ApiResponse<undefined> {
  return {
    status: 'error',
    code: msg.code,
    message: msg.message,
    ...extra,
  } as ApiResponse<undefined>;
}
