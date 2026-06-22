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
    console.log('BootstrapConfig: starting configureApp');
    // ✅ CORS (Fastify plugin)
    const corsOrigins = configService.get<string | string[]>('app.cors.origin');
    const origins = Array.isArray(corsOrigins)
      ? corsOrigins
      : (corsOrigins
        ? corsOrigins.split(',').map(o => o.trim())
        : ['http://localhost:3001', 'http://localhost:5500','http://localhost:3000','http://localhost:4200','http://localhost:3730','http://localhost:8288']);

    console.log('BootstrapConfig: configuring CORS with origins', origins);
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
    console.log('BootstrapConfig: CORS registered');

    // ✅ Cookies
    console.log('BootstrapConfig: registering cookie plugin');
    await app.register(fastifyCookie as unknown as RegisterPlugin, {
      secret: 'my-secret',
    });
    console.log('BootstrapConfig: cookie plugin registered');

    // Global prefix
    const prefix = configService.get('app.apiPrefix') || 'api';
    app.setGlobalPrefix(prefix);
    console.log('BootstrapConfig: global prefix set to', prefix);

    // Validation
    console.log('BootstrapConfig: configuring validation pipes');
    this.configureValidationPipes(app);
    console.log('BootstrapConfig: validation pipes configured');

    // Filters & Interceptors
    console.log('BootstrapConfig: configuring global filters');
    this.configureGlobalFilters(app);
    console.log('BootstrapConfig: global filters configured');

    console.log('BootstrapConfig: configuring global interceptors');
    this.configureGlobalInterceptors(app);
    console.log('BootstrapConfig: global interceptors configured');

    // Versioning
    console.log('BootstrapConfig: configuring versioning');
    this.configureVersioning(app);
    console.log('BootstrapConfig: versioning configured');
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