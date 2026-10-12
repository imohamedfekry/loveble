import { Logger, InternalServerErrorException } from '@nestjs/common';
import { inngest } from '../../client';
import { generateConversationTitle } from 'src/mastra/naming';

const log = new Logger('Inngest:name-conversation');

export const nameConversationFunction = inngest.createFunction(
  {
    id: 'name-conversation',
    name: 'Generate conversation title from first message',
    retries: 3,
    triggers: [{ event: 'conversation/name' }],
  },
  async ({ event, step }) => {
    const conversationId = String(event.data?.conversationId ?? '');
    const text = String(event.data?.text ?? '');
    const modelId = String(event.data?.model ?? '') || undefined;

    if (!conversationId || !text) {
      throw new InternalServerErrorException(
        'name-conversation requires conversationId and text',
      );
    }

    log.log(
      `▶ name-conversation conversationId=${conversationId} text="${text.slice(0, 100)}"`,
    );

    const title = await step.run('generate-title', async () => {
      const startedAt = Date.now();
      const t = await generateConversationTitle(text, modelId);
      log.log(`✓ generate-title "${t}" duration=${Date.now() - startedAt}ms`);
      return t;
    });

    const response = await step.fetch(
      'http://localhost:3001/api/v1/conversations/webhook/generated-title',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({ conversationId, title }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      log.error(
        `✖ name-conversation failed status=${response.status} error="${error}"`,
      );
      throw new InternalServerErrorException(
        `Failed to apply conversation title: ${response.status}`,
      );
    }

    const result: unknown = await response.json();
    log.log(
      `✓ name-conversation conversationId=${conversationId} title="${title}" result=${JSON.stringify(result)}`,
    );
    return { success: true, conversationId, title };
  },
);
