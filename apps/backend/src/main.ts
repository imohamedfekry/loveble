import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrap } from './common/bootstrap';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Bootstrap
  const { serverInfo } = await AppBootstrap.bootstrap(app);

  // Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Start server
  await app.listen(serverInfo.port, '0.0.0.0');

  // Logs
  AppBootstrap.logServerInfo(serverInfo);
}

bootstrap();