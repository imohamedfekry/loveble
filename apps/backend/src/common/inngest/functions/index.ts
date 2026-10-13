import { crawlFunction } from './crawl/crawl.function';
import { persistFileFunction } from './file/persist-file.function';
import { sendEmailFunction } from './email/send-email.function';
import { nameConversationFunction } from './conversation/name-conversation.function';
import { buildConversationFunction } from './conversation/build-conversation.function';

export const inngestFunctions = [
  crawlFunction,
  persistFileFunction,
  sendEmailFunction,
  nameConversationFunction,
  buildConversationFunction,
];

export const functions = inngestFunctions;
