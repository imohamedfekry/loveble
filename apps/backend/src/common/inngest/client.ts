import { Inngest } from 'inngest';
import { extendedTracesMiddleware } from 'inngest/experimental';

export const inngest = new Inngest({
  id: 'loveble',
  name: 'Loveble',
  isDev: process.env.NODE_ENV !== 'production',
  middleware: [extendedTracesMiddleware()],
});