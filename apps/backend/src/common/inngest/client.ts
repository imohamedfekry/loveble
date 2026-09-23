import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'loveble',
  name: 'Loveble',
  isDev: process.env.NODE_ENV !== 'production',
});
