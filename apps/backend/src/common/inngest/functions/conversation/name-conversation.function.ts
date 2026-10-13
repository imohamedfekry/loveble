import { Logger, InternalServerErrorException } from '@nestjs/common';
import { inngest } from '../../client';
import { generateNames } from 'src/mastra/naming';
import { getNestApp } from '../../nest-context';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';

const log = new Logger('Inngest:name-conversation');

/**
 * Unified naming job: one agent call produces both the project name and the
 * conversation title from the first user message. Each side is gated at apply
 * time — the conversation title is applied (it was null at enqueue), and the
 * project name is applied only while the project still carries its placeholder
 * (`nameGenerated === false`), so a second conversation or a manual rename can
 * never clobber a real name.
 */
export const nameConversationFunction = inngest.createFunction(
  {
    id: 'name-conversation',
    name: 'Generate project name and conversation title from first message',
    retries: 3,
    triggers: [{ event: 'conversation/name' }],
  },
  async ({ event, step }) => {
    const conversationId = String(event.data?.conversationId ?? '');
    const projectId = String(event.data?.projectId ?? '');
    const text = String(event.data?.text ?? '');
    const modelId = String(event.data?.model ?? '') || undefined;

    if (!conversationId || !text) {
      throw new InternalServerErrorException(
        'name-conversation requires conversationId and text',
      );
    }

    log.log(
      `▶ name-conversation conversationId=${conversationId} projectId=${projectId} text="${text.slice(0, 100)}"`,
    );

    const names = await step.run('generate-names', async () => {
      const startedAt = Date.now();
      const t = await generateNames(text, modelId);
      log.log(
        `✓ generate-names project="${t.projectName}" conversation="${t.conversationTitle}" duration=${Date.now() - startedAt}ms`,
      );
      return t;
    });

    const convResp = await step.fetch(
      'http://localhost:3001/api/v1/conversations/webhook/generated-title',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          conversationId,
          title: names.conversationTitle,
        }),
      },
    );

    if (!convResp.ok) {
      const error = await convResp.text();
      log.error(
        `✖ name-conversation apply-title status=${convResp.status} error="${error}"`,
      );
      throw new InternalServerErrorException(
        `Failed to apply conversation title: ${convResp.status}`,
      );
    }

    let projectNameApplied = false;
    if (projectId) {
      const needsName = await step.run('check-project-name', async () => {
        try {
          const repo = getNestApp().get(ProjectRepository);
          const project = await repo.findById(BigInt(projectId));
          return Boolean(project && !project.nameGenerated);
        } catch (error) {
          log.warn(`check-project-name failed: ${String(error)}`);
          return false;
        }
      });

      if (needsName) {
        const projResp = await step.fetch(
          'http://localhost:3001/api/v1/projects/webhook/generated-name',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
            },
            body: JSON.stringify({ projectId, name: names.projectName }),
          },
        );
        if (!projResp.ok) {
          const error = await projResp.text();
          log.error(
            `✖ name-conversation apply-name status=${projResp.status} error="${error}"`,
          );
          throw new InternalServerErrorException(
            `Failed to apply project name: ${projResp.status}`,
          );
        }
        projectNameApplied = true;
      } else {
        log.log(`↺ project ${projectId} already named, skipping project apply`);
      }
    }

    return {
      success: true,
      conversationId,
      projectId,
      title: names.conversationTitle,
      projectName: names.projectName,
      projectNameApplied,
    };
  },
);
