import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'squadra',
  isDev: process.env.NODE_ENV !== 'production',
});