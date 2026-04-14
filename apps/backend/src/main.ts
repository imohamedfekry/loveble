import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrap } from './common/bootstrap';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: 'http://localhost:3001', // domain الـ front-end
      credentials: true, // مهم جداً للكوكيز
    },
  });
  // Bootstrap the application
  const { serverInfo } = await AppBootstrap.bootstrap(app as any);

  // Register global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Start the server
  await app.listen(serverInfo.port);

  // Log server information
  AppBootstrap.logServerInfo(serverInfo);
}
bootstrap();