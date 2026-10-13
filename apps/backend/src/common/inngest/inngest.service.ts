import { Injectable } from '@nestjs/common';
import { inngest } from './client';

export const INNGEST_EVENTS = {
  CRAWL_RUN: 'crawl/run',
  FILE_PERSIST: 'file/persist',
  SEND_EMAIL: 'email/send',
  CONVERSATION_NAME: 'conversation/name',
  CONVERSATION_BUILD: 'conversation/build',
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

  persistFile(data: { fileId: string; projectId?: string }) {
    return this.send(INNGEST_EVENTS.FILE_PERSIST, {
      ...data,
      fileId: String(data.fileId),
    });
  }

  sendEmail(data: {
    to: string;
    template: string;
    templateData: Record<string, unknown>;
  }) {
    return this.send(INNGEST_EVENTS.SEND_EMAIL, data);
  }

  nameConversation(data: {
    conversationId: string;
    projectId?: string;
    text: string;
    model?: string;
  }) {
    return this.send(INNGEST_EVENTS.CONVERSATION_NAME, data);
  }

  /** Run the routed agent (builder or team) on the first message of a project. */
  runFirstBuild(data: {
    projectId: string;
    conversationId: string;
    userId: string;
    content: string;
  }) {
    return this.send(INNGEST_EVENTS.CONVERSATION_BUILD, data);
  }
}
