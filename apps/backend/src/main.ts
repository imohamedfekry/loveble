import * as dotenv from 'dotenv';
dotenv.config();
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrap } from './common/bootstrap';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { BigIntInterceptor } from './common/interceptors/BigInt.interceptors';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { fastifyPlugin } from 'inngest/fastify';
import { inngest } from './common/inngest/client';
import { functions } from './common/inngest/functions';
import { setNestApp } from './common/inngest/nest-context';
import { registerPreviewProxy } from './Modules/preview/preview.proxy';
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const fastify = app.getHttpAdapter().getInstance();
  fastify.register(fastifyPlugin, {
    client: inngest,
    functions,
  });

  // Preview proxy: raw Fastify routes so sandbox responses stream through
  // unwrapped (outside the Nest response envelope).
  registerPreviewProxy(fastify, app);

  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });

  const { serverInfo } = await AppBootstrap.bootstrap(app);

  // ===============================
  // Register Global Interceptors
  // ===============================
  // BigIntInterceptor: Converts all BigInt values to strings for JSON serialization
  // ResponseInterceptor: Wraps all responses in the standard ApiResponse format
  app.useGlobalInterceptors(new BigIntInterceptor(), new ResponseInterceptor());
  setNestApp(app);

  console.log('🧭 About to start listening on port', serverInfo.port);
  const listenPromise = app.listen(serverInfo.port, '0.0.0.0');
  const timeoutMs = 10000;
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('listen timeout')), timeoutMs),
  );
  try {
    await Promise.race([listenPromise, timeout]);
    console.log('✅ app.listen resolved');
  } catch (err) {
    console.error(`❗ app.listen did not resolve within ${timeoutMs}ms`, err);
  }
  AppBootstrap.logServerInfo(serverInfo);
}

void bootstrap();
