import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../utils/types';

const DEFAULT_STATUS = 'success';
const DEFAULT_CODE = 'SUCCESS';
const DEFAULT_MESSAGE = 'Operation completed successfully';

function isApiResponse(value: unknown): value is ApiResponse<any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'code' in value &&
    'message' in value
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (isApiResponse(data)) return data as ApiResponse<T>;

        const isObject = typeof data === 'object' && data !== null;

        return {
          status: DEFAULT_STATUS,
          code: DEFAULT_CODE,
          message: DEFAULT_MESSAGE,
          data: isObject ? data : { value: data },
        } satisfies ApiResponse<any>;
      }),
    );
  }
}
