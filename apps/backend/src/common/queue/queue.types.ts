import type { ModelId } from 'src/ai/providers/types';

export type CrawlJobData = {
  urls: string[];
};

export type GenerateTextJobData = {
  prompt: string;
  model?: ModelId;
};

export type CreateProjectJobData = {
  prompt: string;
  model?: ModelId;
};

export type PersistFileJobData = {
  fileId: string;
  projectId?: string;
};
