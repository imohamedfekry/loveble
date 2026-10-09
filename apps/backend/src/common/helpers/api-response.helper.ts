import { fail, success, error } from '../utils/response.util';

/**
 * @deprecated Use `success / fail / error` from `src/common/utils/response.util`
 * directly. This shim exists only for backward compat — its old
 * `success(data, message)` arg order is the opposite of the canonical
 * `success(msg, data)` and was a source of confusion.
 */
export const ApiResponseHelper = {
  success,
  fail,
  error,
};

export const ApiResponse = ApiResponseHelper;
