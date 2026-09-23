export const QUEUE_NAMES = {
  CRAWL: 'crawl',
  GENERATE_TEXT: 'generate-text',
  CREATE_PROJECT: 'create-project',
  PERSIST_FILE: 'persist-file',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  CRAWL_RUN: 'crawl/run',
  TEXT_GENERATE: 'text/generate',
  PROJECT_CREATE: 'project/create',
  FILE_PERSIST: 'file/persist',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 200,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
};
