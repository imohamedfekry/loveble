import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../utils/types';
import { isApiResponse } from '../utils/response.util';

const DEFAULT_MESSAGE = 'Operation completed successfully';

// Routes that serve raw content (HTML docs UI, pre-stringified JSON specs,
// webhooks like Inngest, mock server). Wrapping them in ApiResponse breaks
// Fastify: e.g. `Content-Type: text/html` + object payload throws
// "Attempted to send payload of invalid type 'object'".
const SKIP_URL_PATTERNS = [
  '/docs',
  '/specscribe-mock',
  '/specscribe',
  '/inngest',
];

function shouldBypassByUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  return SKIP_URL_PATTERNS.some((p) => url.includes(p));
}

function isRawPayload(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  if (value instanceof Uint8Array) return true;
  // Streams (file downloads etc.) have a .pipe function — never wrap them.
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).pipe === 'function'
  ) {
    return true;
  }
  return false;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const req = context.switchToHttp().getRequest<{
      url?: string;
      originalUrl?: string;
      raw?: { url?: string };
    }>();

    const url = req?.url ?? req?.originalUrl ?? req?.raw?.url;
    if (shouldBypassByUrl(url)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Raw HTML (SpecScribe docs UI), pre-stringified JSON specs,
        // Buffers and streams must be sent verbatim.
        if (isRawPayload(data)) return data;

        if (isApiResponse(data)) return data as ApiResponse<T>;

        const isObject = typeof data === 'object' && data !== null;

        const response: ApiResponse<any> = {
          success: true,
          message: DEFAULT_MESSAGE,
          data: isObject ? data : { value: data },
        };

        return response;
      }),
    );
  }
}
