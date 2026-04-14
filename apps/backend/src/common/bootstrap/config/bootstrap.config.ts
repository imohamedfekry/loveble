import { NestApplication } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CatchAllFilter from '../../filters/catchAll.filter';
import CustomHttpException from '../../filters/customHttpException.filter';
import { BigIntInterceptor } from '../../interceptors/BigInt.interceptors';
import cookieParser from 'cookie-parser';
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';

export class BootstrapConfig {
  static async configureApp(
    app: NestApplication,
    configService: ConfigService,
  ) {
    // Enable CORS
    app.enableCors({
      origin: configService.get('app.cors.origin') || '*',
      methods: configService.get('app.cors.methods') || [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ],
      credentials: configService.get('app.cors.credentials') || true,
    });

    // Set global prefix
    app.setGlobalPrefix(configService.get('app.apiPrefix') || 'api');
    // Configure validation pipes
    this.configureValidationPipes(app);

    // Configure global filters and interceptors
    this.configureGlobalFilters(app);
    this.configureGlobalInterceptors(app);

    // Enable versioning
    this.configureVersioning(app);

    // Use cookie parser middleware
    this.configureCookieParser(app);
    
  }

  private static configureValidationPipes(app: NestApplication) {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      stopAtFirstError: true,
      transform: true,
      validateCustomDecorators: true,
    });
    app.useGlobalPipes(new StandardValidationPipe());
    // app.useGlobalPipes(validationPipe);
  }

  private static configureGlobalFilters(app: NestApplication) {
    app.useGlobalFilters(new CatchAllFilter(), new CustomHttpException());
  }

  private static configureGlobalInterceptors(app: NestApplication) {
    app.useGlobalInterceptors(new BigIntInterceptor());
  }

  private static configureVersioning(app: NestApplication) {
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
  }
  // configure cookie parser middleware
  private static configureCookieParser(app: NestApplication) {
    app.use(cookieParser());
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
