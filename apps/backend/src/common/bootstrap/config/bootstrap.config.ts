import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { RequestMethod, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpExceptionFilter } from '../../filters/customHttpException.filter';
import { CatchAllFilter } from '../../filters/catchAll.filter';
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';

import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';

type RegisterPlugin = Parameters<NestFastifyApplication['register']>[0];

export class BootstrapConfig {
  static async configureApp(
    app: NestFastifyApplication,
    configService: ConfigService,
  ) {
    const corsOrigins = configService.get<string | string[]>('app.cors.origin');
    const origins = Array.isArray(corsOrigins)
      ? corsOrigins
      : corsOrigins
        ? corsOrigins.split(',').map((o) => o.trim())
        : [
            'http://localhost:3001',
            'http://localhost:5500',
            'http://localhost:3000',
            'http://localhost:4200',
            'http://localhost:3730',
          ];

    await app.register(fastifyCors as unknown as RegisterPlugin, {
      origin: origins,
      methods: configService.get<string[]>('app.cors.methods') || [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'HEAD',
      ],
      credentials: configService.get<boolean>('app.cors.credentials') ?? true,
    });

    const cookieSecret =
      configService.get<string>('app.cookieSecret') ||
      process.env.COOKIE_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error(
              'Missing required env var COOKIE_SECRET in production',
            );
          })()
        : 'dev-cookie-secret');
    await app.register(fastifyCookie as unknown as RegisterPlugin, {
      secret: cookieSecret,
    });

    // Global prefix — keep the queue dashboard off the API prefix/versioning.
    const prefix = configService.get('app.apiPrefix') || 'api';
    app.setGlobalPrefix(prefix, {
      exclude: [
        { path: 'queues', method: RequestMethod.ALL },
        { path: 'queues/{*path}', method: RequestMethod.ALL },
      ],
    });

    // Validation
    this.configureValidationPipes(app);
    // Filters (global interceptors are registered once in main.ts)
    this.configureGlobalFilters(app);
    // Versioning
    this.configureVersioning(app);
  }

  private static configureValidationPipes(app: NestFastifyApplication) {
    app.useGlobalPipes(new StandardValidationPipe());
  }

  private static configureGlobalFilters(app: NestFastifyApplication) {
    app.useGlobalFilters(new CatchAllFilter(), new HttpExceptionFilter());
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
