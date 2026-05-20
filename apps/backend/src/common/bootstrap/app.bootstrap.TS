import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { BootstrapConfig } from './config/bootstrap.config';
import { inngest } from '../inngest/client';

type BootstrapResult = {
  app: NestFastifyApplication;
  configService: ConfigService;
  serverInfo: {
    port: number;
    nodeEnv: string;
    apiUrl: string;
  };
};

export class AppBootstrap {
  static async bootstrap(
    app: NestFastifyApplication,
  ): Promise<BootstrapResult> {
    const configService = app.get(ConfigService);

    await BootstrapConfig.configureApp(app, configService);

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
    console.log(`🔗 API Base URL: ${serverInfo.apiUrl}`);
  }
}