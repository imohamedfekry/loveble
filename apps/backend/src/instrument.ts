import * as dotenv
from "dotenv";

import * as Sentry
from "@sentry/nestjs";

import {
  googleGenAIIntegration,
  vercelAIIntegration,
} from "@sentry/nestjs";

dotenv.config();

Sentry.init({
  dsn:
    process.env.SENTRY_DSN,

  environment:
    process.env.NODE_ENV ??
    "development",

  tracesSampleRate: 1,

  sendDefaultPii: true,

  streamGenAiSpans: true,

  integrations: [
    googleGenAIIntegration(),

    vercelAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});