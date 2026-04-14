import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseHelper } from '../helpers/api-response.helper';
import { RESPONSE_CODES } from '../constants/response-codes';

@Catch()
export default class CatchAllFilter implements ExceptionFilter {
  catch(exception: Error & { code?: string }, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    console.log(exception);
    if (process.env.NODE_ENV === 'development') {
      return this.errorDev(res, exception);
    } else {
      return this.errorProd(res);
    }
  }

  errorDev(res: Response, exception: Error & { code?: string | undefined }) {
    res.status(500).json(
      ApiResponseHelper.error(
        { code: RESPONSE_CODES.SERVER_ERROR, message: exception.message },
        {
          timestamp: new Date().toISOString(),
          // @ts-expect-error allow meta in dev
          meta: { exception },
        },
      ),
    );
  }

  errorProd(res: Response) {
    res.status(500).json(
      ApiResponseHelper.error({
        code: RESPONSE_CODES.SERVER_ERROR,
        message: 'Internal Server Error',
      }),
    );
  }
}
