import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponseHelper } from '../helpers/api-response.helper';

interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{ path: string[]; message: string }>;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<FastifyReply>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      | ValidationErrorResponse
      | string;

    // ─── Validation errors (from @mag123c/nestjs-stdschema / Valibot) ─────────
    if (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.errors) &&
      exceptionResponse.errors.length > 0
    ) {
      const errors = exceptionResponse.errors.map((e) => {
        let message = e.message;

        // Custom handling for technical Valibot 1.x messages when a key is missing or invalid
        if (message.includes('Invalid key: Expected')) {
          const match = message.match(/Expected "([^"]+)"/);
          const fieldName = match ? match[1] : (e.path?.join('.') ?? 'field');
          message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        } else if (message.includes('Invalid type: Expected string but received undefined')) {
          const fieldName = e.path?.join('.') ?? 'Field';
          message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }

        return {
          field: e.path?.join('.') ?? 'unknown',
          message: message,
        };
      });

      return res.code(status).send(
        ApiResponseHelper.fail(
          {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed. Please check the errors below.',
          },
          { errors } as any,
        ),
      );
    }

    // ─── Generic HttpException (4xx / 5xx) ────────────────────────────────────
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse.message ?? 'An error occurred');

    const isClientError = status >= 400 && status < 500;

    if (isClientError) {
      return res.code(status).send(
        ApiResponseHelper.fail({
          code: this.resolveCode(status),
          message,
        }),
      );
    }

    return res.code(status).send(
      ApiResponseHelper.error({
        code: this.resolveCode(status),
        message,
      }),
    );
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