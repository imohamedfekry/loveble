import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponseHelper } from '../helpers/api-response.helper';
import { RESPONSE_CODES } from '../constants/response-codes';

@Catch()
export class CatchAllFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<FastifyReply>();

    console.log(exception);

    if (process.env.NODE_ENV === 'development') {
      return this.errorDev(res, exception);
    }

    return this.errorProd(res);
  }

  errorDev(res: FastifyReply, exception: unknown) {
    return res.code(500).send(
      ApiResponseHelper.error(
        {
          code: RESPONSE_CODES.SERVER_ERROR,
          message: (exception as Error)?.message || 'Unknown error',
        },
        {
          timestamp: new Date().toISOString(),
          meta: { exception },
        } as any,
      ),
    );
  }

  errorProd(res: FastifyReply) {
    return res.code(500).send(
      ApiResponseHelper.error({
        code: RESPONSE_CODES.SERVER_ERROR,
        message: 'Internal Server Error',
      }),
    );
  }
}