import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrap } from './common/bootstrap';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new FastifyAdapter(),
  ) as NestFastifyApplication;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const { serverInfo } = await AppBootstrap.bootstrap(app);

  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(serverInfo.port, '0.0.0.0');

  AppBootstrap.logServerInfo(serverInfo);
}

bootstrap();