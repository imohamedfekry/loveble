import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrap } from './common/bootstrap';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { fastifyPlugin } from 'inngest/fastify';
import { inngest } from './common/inngest/client';
import { functions } from './common/inngest/index';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new FastifyAdapter(),
  ) as NestFastifyApplication;

  const fastify = app.getHttpAdapter().getInstance();

  fastify.register(fastifyPlugin as any, {
    client: inngest,
    functions,
  });

  const { serverInfo } = await AppBootstrap.bootstrap(app);
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(serverInfo.port, '0.0.0.0');
  AppBootstrap.logServerInfo(serverInfo);
}

bootstrap();