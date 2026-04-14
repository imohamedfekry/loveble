import { NestApplication } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { BootstrapConfig } from './config/bootstrap.config';

export class AppBootstrap {
  static async bootstrap(app: NestApplication) {
    const configService = app.get(ConfigService);

    // Configure app
    await BootstrapConfig.configureApp(app, configService);

    // Get server info
    const serverInfo = BootstrapConfig.getServerInfo(configService);

    return {
      app,
      configService,
      serverInfo,
    };
  }

  static logServerInfo(serverInfo: any) {
    console.log(`🚀 Server is running on port ${serverInfo.port}`);
    console.log(`🌍 Environment: ${serverInfo.nodeEnv}`);
    // console.log(`📚 API Documentation: ${serverInfo.swaggerUrl}`);
    console.log(`🔗 API Base URL: ${serverInfo.apiUrl}`);
  }
}
