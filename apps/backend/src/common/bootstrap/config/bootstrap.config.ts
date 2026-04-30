import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpExceptionFilter } from '../../filters/customHttpException.filter';
import { CatchAllFilter } from '../../filters/catchAll.filter';
import { BigIntInterceptor } from '../../interceptors/BigInt.interceptors';
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';

// import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';

type RegisterPlugin = Parameters<NestFastifyApplication['register']>[0];

export class BootstrapConfig {
  static async configureApp(
    app: NestFastifyApplication,
    configService: ConfigService,
  ) {
    // ✅ CORS (Fastify plugin)
    const corsOrigins = configService.get<string | string[]>('app.cors.origin');
    const origins = Array.isArray(corsOrigins)
      ? corsOrigins
      : (corsOrigins
        ? corsOrigins.split(',').map(o => o.trim())
        : ['http://localhost:3001', 'http://localhost:5500','http://localhost:3000']);

    await app.register(fastifyCors as unknown as RegisterPlugin, {
      origin: origins,

      methods:
        configService.get<string[]>('app.cors.methods') || [
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
          'HEAD',
        ],

      credentials:
        configService.get<boolean>('app.cors.credentials') ?? true,
    });

    // ✅ Cookies
    await app.register(fastifyCookie as unknown as RegisterPlugin, {
      secret: 'my-secret',
    });

    // Global prefix
    app.setGlobalPrefix(configService.get('app.apiPrefix') || 'api');

    // Validation
    this.configureValidationPipes(app);

    // Filters & Interceptors
    this.configureGlobalFilters(app);
    this.configureGlobalInterceptors(app);

    // Versioning
    this.configureVersioning(app);
  }

  private static configureValidationPipes(app: NestFastifyApplication) {
    app.useGlobalPipes(new StandardValidationPipe());
  }

  private static configureGlobalFilters(app: NestFastifyApplication) {
    app.useGlobalFilters(new CatchAllFilter(), new HttpExceptionFilter());
  }

  private static configureGlobalInterceptors(app: NestFastifyApplication) {
    app.useGlobalInterceptors(new BigIntInterceptor());
  }

  private static configureVersioning(app: NestFastifyApplication) {
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
  }

  static getServerInfo(configService: ConfigService) {
    const port =
      configService.get<number>('app.port') ??
      parseInt(process.env.PORT ?? '3000', 10);

    const nodeEnv =
      configService.get<string>('app.nodeEnv') ??
      process.env.NODE_ENV ??
      'development';

    const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';
    const apiVersion = configService.get<string>('app.apiVersion') ?? 'v1';

    return {
      port,
      nodeEnv,
      apiUrl: `http://localhost:${port}/${apiPrefix}/${apiVersion}`,
    };
  }
}