import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseHelper } from '../helpers/api-response.helper';
import { RESPONSE_CODES } from '../constants/response-codes';

@Catch(HttpException)
export default class CustomHttpException implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;

    // We can add more logs here in the system itself
    // that's the default error handling

    if (process.env.NODE_ENV === 'development') {
      this.errorDev(status, res, exception);
    } else {
      this.errorProd(status, res, message);
    }
  }

  errorDev(status: number, res: Response, exception: HttpException) {
    res.status(status).json(
      ApiResponseHelper.error(
        { code: RESPONSE_CODES.SERVER_ERROR, message: exception.message },
        {
          timestamp: new Date().toISOString(),
          data: undefined,
          // expose exception in dev for debugging
          // @ts-expect-error allow meta in dev
          meta: { exception },
        },
      ),
    );
  }

  errorProd(status: number, res: Response, message: string) {
    res
      .status(status)
      .json(
        ApiResponseHelper.error({ code: RESPONSE_CODES.SERVER_ERROR, message }),
      );
  }
}
