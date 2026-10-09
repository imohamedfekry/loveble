import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { serializeBigInt } from 'src/common/utils/bigint.util';

const SKIP_URL_PATTERNS = [
  '/docs',
  '/specscribe-mock',
  '/specscribe',
  '/inngest',
];

function shouldBypass(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  if (value instanceof Uint8Array) return true;
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
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<{
      url?: string;
      originalUrl?: string;
    }>();
    const url: unknown = req?.url ?? req?.originalUrl;
    if (
      typeof url === 'string' &&
      SKIP_URL_PATTERNS.some((p) => url.includes(p))
    ) {
      return next.handle();
    }
    return next
      .handle()
      .pipe(map((data) => (shouldBypass(data) ? data : serializeBigInt(data))));
  }
}
