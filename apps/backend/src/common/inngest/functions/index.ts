import { crawlFunction } from './crawl.function';
import { generateTextFunction } from './generate-text.function';
import { createProjectFunction } from './create-project.function';
import { persistFileFunction } from './persist-file.function';

export const inngestFunctions = [
  crawlFunction,
  generateTextFunction,
  createProjectFunction,
  persistFileFunction,
];

export const functions = inngestFunctions;
