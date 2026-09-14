import { crawlFunction } from './crawl.function';
import { generateText } from './ask.ai';
import { createProject } from './createProject.function';
import { persistFile } from './persistFile.function';

export * from './crawl.function';
export * from './ask.ai';
export * from './createProject.function';
export * from './persistFile.function';

export const functions = [crawlFunction, generateText, createProject, persistFile].filter(Boolean);
