import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { fail, error } from '../utils/response.util';

interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{ path: string[]; message: string }>;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<FastifyReply>();
    // Same as CatchAllFilter: force JSON so error responses from raw
    // HTML/JSON-string routes (docs, specs) don't trigger Fastify's
    // "invalid payload type 'object'" error.
    try {
      res.header('content-type', 'application/json; charset=utf-8');
    } catch {
      /* ignore — reply may already be sent */
    }
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      (ValidationErrorResponse & { code?: string }) | string;

    // ─── Validation errors (from @mag123c/nestjs-stdschema / Valibot) ─────────
    if (
      typeof exceptionResponse === 'object' &&
      Array.isArray((exceptionResponse as ValidationErrorResponse).errors) &&
      ((exceptionResponse as ValidationErrorResponse).errors as unknown[])
        .length > 0
    ) {
      const errors = (
        (exceptionResponse as ValidationErrorResponse).errors ?? []
      ).map((e) => {
        let message = e.message;

        // Custom handling for technical Valibot 1.x messages when a key is missing or invalid
        if (message.includes('Invalid key: Expected')) {
          const match = message.match(/Expected "([^"]+)"/);
          const fieldName = match ? match[1] : (e.path?.join('.') ?? 'field');
          message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        } else if (
          message.includes(
            'Invalid type: Expected string but received undefined',
          )
        ) {
          const fieldName = e.path?.join('.') ?? 'Field';
          message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }

        return {
          field: e.path?.join('.') ?? 'unknown',
          message: message,
        };
      });

      return res.code(status).send(
        fail(
          {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed. Please check the errors below.',
          },
          { errors } as any,
        ),
      );
    }

    // ─── Generic HttpException (4xx / 5xx) ────────────────────────────────────
    // Services throw like `new NotFoundException(fail(RESPONSE_MESSAGES.X))`,
    // so the specific `code` (e.g. PROJECT_NOT_FOUND) lives inside
    // exceptionResponse. Preserve it instead of replacing it with a generic
    // HTTP_xxx code.
    const asObj =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as { code?: unknown; message?: unknown })
        : null;
    const embeddedCode =
      asObj && typeof asObj.code === 'string' ? asObj.code : undefined;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof asObj?.message === 'string'
          ? asObj.message
          : 'An error occurred';

    const code = embeddedCode ?? this.resolveCode(status);
    const isClientError = status >= 400 && status < 500;

    if (isClientError) {
      return res.code(status).send(fail({ code, message }));
    }

    return res.code(status).send(error({ code, message }));
  }

  private resolveCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}
