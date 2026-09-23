import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { BootstrapConfig } from './config/bootstrap.config';

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

  static logServerInfo(serverInfo: BootstrapResult['serverInfo']) {
    console.log(`🚀 Server is running on port ${serverInfo.port}`);
    console.log(`🌍 Environment: ${serverInfo.nodeEnv}`);
    console.log(`🔗 API Base URL: ${serverInfo.apiUrl}`);
    console.log(
      `⚡ Inngest endpoint: http://localhost:${serverInfo.port}/api/inngest`,
    );
    console.log(
      `🧪 Inngest Dev: run \`pnpm inngest\` → UI http://localhost:8288`,
    );
  }
}
