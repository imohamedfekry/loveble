import { crawlFunction } from './crawl/crawl.function';
import { generateTextFunction } from './text/generate-text.function';
import { createProjectFunction } from './project/create-project.function';
import { persistFileFunction } from './file/persist-file.function';
import { sendEmailFunction } from './email/send-email.function';
import { nameConversationFunction } from './conversation/name-conversation.function';

export const inngestFunctions = [
  crawlFunction,
  generateTextFunction,
  createProjectFunction,
  persistFileFunction,
  sendEmailFunction,
  nameConversationFunction,
];

export const functions = inngestFunctions;
