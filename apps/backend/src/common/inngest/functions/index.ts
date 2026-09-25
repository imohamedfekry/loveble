import { crawlFunction } from './crawl.function';
import { generateTextFunction } from './generate-text.function';
import { createProjectFunction } from './create-project.function';
import { persistFileFunction } from './persist-file.function';
import { sendEmailFunction } from './send-email.function';

export const inngestFunctions = [
  crawlFunction,
  generateTextFunction,
  createProjectFunction,
  persistFileFunction,
  sendEmailFunction,
];

export const functions = inngestFunctions;
