import { Injectable } from '@nestjs/common';
import { inngest } from './client';

export const INNGEST_EVENTS = {
  CRAWL_RUN: 'crawl/run',
  TEXT_GENERATE: 'text/generate',
  PROJECT_CREATE: 'project/create',
  FILE_PERSIST: 'file/persist',
} as const;

export type InngestEventName =
  (typeof INNGEST_EVENTS)[keyof typeof INNGEST_EVENTS];

@Injectable()
export class InngestService {
  send(name: InngestEventName, data: Record<string, unknown>) {
    return inngest.send({ name, data });
  }

  crawl(urls: string[]) {
    return this.send(INNGEST_EVENTS.CRAWL_RUN, { urls });
  }

  generateText(data: { prompt: string; model?: string }) {
    return this.send(INNGEST_EVENTS.TEXT_GENERATE, data);
  }

  createProject(data: { projectId: string; prompt: string; model?: string }) {
    return this.send(INNGEST_EVENTS.PROJECT_CREATE, data);
  }

  persistFile(data: { fileId: string; projectId?: string }) {
    return this.send(INNGEST_EVENTS.FILE_PERSIST, {
      ...data,
      fileId: String(data.fileId),
    });
  }
}
