import type { INestApplication } from '@nestjs/common';

let app: INestApplication | null = null;

/** Set once after NestFactory.create so Inngest handlers can resolve DI. */
export function setNestApp(instance: INestApplication): void {
  app = instance;
}

export function getNestApp(): INestApplication {
  if (!app) {
    throw new Error(
      'Nest app not initialized yet — Inngest handler invoked too early',
    );
  }
  return app;
}
