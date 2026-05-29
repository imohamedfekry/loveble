import type { ArgumentsHost } from '@nestjs/common';
import { Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponseHelper } from '../helpers/api-response.helper';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class CatchAllFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    // HttpException is handled by HttpExceptionFilter — skip it here
    if (exception instanceof HttpException) return;

    const res = host.switchToHttp().getResponse<FastifyReply>();

    console.error('[CatchAllFilter] Unhandled exception:', exception);

    if (process.env.NODE_ENV === 'development') {
      return res.code(500).send(
        ApiResponseHelper.error(
          {
            code: 'SERVER_ERROR',
            message:
              (exception as Error)?.message ?? 'Unexpected internal error',
          },
          {
            timestamp: new Date().toISOString(),
            stack:
              (exception as Error)?.stack?.split('\n').slice(0, 6) ??
              undefined,
          } as any,
        ),
      );
    }

    return res.code(500).send(
      ApiResponseHelper.error({
        code: 'SERVER_ERROR',
        message: 'Internal Server Error',
      }),
    );
  }
}