import type { ArgumentsHost } from '@nestjs/common';
import { Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { error } from '../utils/response.util';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class CatchAllFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    // HttpException is handled by HttpExceptionFilter — skip it here
    if (exception instanceof HttpException) return;

    const res = host.switchToHttp().getResponse<FastifyReply>();

    console.error('[CatchAllFilter] Unhandled exception:', exception);

    // The failing route may have set `Content-Type: text/html` (e.g. docs UI).
    // Sending an object with that header makes Fastify throw
    // "Attempted to send payload of invalid type 'object'". Force JSON.
    try {
      res.header('content-type', 'application/json; charset=utf-8');
    } catch {
      /* ignore — reply may already be sent */
    }

    if (process.env.NODE_ENV === 'development') {
      return res.code(500).send(
        error(
          {
            code: 'SERVER_ERROR',
            message:
              (exception as Error)?.message ?? 'Unexpected internal error',
          },
          {
            timestamp: new Date().toISOString(),
            stack:
              (exception as Error)?.stack?.split('\n').slice(0, 6) ?? undefined,
          } as any,
        ),
      );
    }

    return res.code(500).send(
      error({
        code: 'SERVER_ERROR',
        message: 'Internal Server Error',
      }),
    );
  }
}
