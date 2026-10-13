import { Logger, InternalServerErrorException } from '@nestjs/common';
import { inngest } from '../../client';
import { generateNames } from 'src/mastra/naming';
import { getNestApp } from '../../nest-context';
import { ConversationRepository } from 'src/common/database/repositories/conversations/conversation.repository';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';

const log = new Logger('Inngest:name-conversation');

const TITLE_WEBHOOK =
  'http://localhost:3001/api/v1/conversations/webhook/generated-title';
const NAME_WEBHOOK =
  'http://localhost:3001/api/v1/projects/webhook/generated-name';

function webhookHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
  };
}

/**
 * Unified naming job: one agent call produces both the project name and the
 * conversation title from the first user message. Each side is gated — the
 * title is generated only while the conversation still has none, and the
 * project name only while the project still carries its placeholder
 * (`nameGenerated === false`). Duplicate deliveries (the dashboard create and
 * the client's first-message persist each enqueue one) skip the LLM call
 * entirely once everything is already named.
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

    const needed = await step.run('check-needed', async () => {
      try {
        const app = getNestApp();
        const conversation = await app
          .get(ConversationRepository)
          .findById(BigInt(conversationId));
        const needTitle = Boolean(conversation && !conversation.title);
        let needName = false;
        if (projectId) {
          try {
            const project = await app
              .get(ProjectRepository)
              .findById(BigInt(projectId));
            needName = Boolean(project && !project.nameGenerated);
          } catch (error) {
            log.warn(`check-needed project lookup failed: ${String(error)}`);
          }
        }
        return { needTitle, needName };
      } catch (error) {
        // DB unreachable: fall through and generate both rather than dropping
        // the naming entirely.
        log.warn(`check-needed failed, generating anyway: ${String(error)}`);
        return { needTitle: true, needName: Boolean(projectId) };
      }
    });

    if (!needed.needTitle && !needed.needName) {
      log.log(`↺ conversation ${conversationId} already named, skipping`);
      return { success: true, conversationId, projectId, skipped: true };
    }

    const names = await step.run('generate-names', async () => {
      const startedAt = Date.now();
      const t = await generateNames(text, modelId);
      log.log(
        `✓ generate-names project="${t.projectName}" conversation="${t.conversationTitle}" duration=${Date.now() - startedAt}ms`,
      );
      return t;
    });

    if (needed.needTitle) {
      await step.run('apply-title', async () => {
        const convResp = await fetch(TITLE_WEBHOOK, {
          method: 'POST',
          headers: webhookHeaders(),
          body: JSON.stringify({
            conversationId,
            title: names.conversationTitle,
          }),
        });
        if (!convResp.ok) {
          const error = await convResp.text();
          log.error(
            `✖ name-conversation apply-title status=${convResp.status} error="${error}"`,
          );
          throw new InternalServerErrorException(
            `Failed to apply conversation title: ${convResp.status}`,
          );
        }
      });
    }

    let projectNameApplied = false;
    if (needed.needName && projectId) {
      // Re-check at apply time: a concurrent run (or a manual rename) may have
      // named the project while we were generating.
      const stillNeeded = await step.run('check-project-name', async () => {
        try {
          const project = await getNestApp()
            .get(ProjectRepository)
            .findById(BigInt(projectId));
          return Boolean(project && !project.nameGenerated);
        } catch (error) {
          log.warn(`check-project-name failed: ${String(error)}`);
          return false;
        }
      });

      if (stillNeeded) {
        await step.run('apply-name', async () => {
          const projResp = await fetch(NAME_WEBHOOK, {
            method: 'POST',
            headers: webhookHeaders(),
            body: JSON.stringify({ projectId, name: names.projectName }),
          });
          if (!projResp.ok) {
            const error = await projResp.text();
            log.error(
              `✖ name-conversation apply-name status=${projResp.status} error="${error}"`,
            );
            throw new InternalServerErrorException(
              `Failed to apply project name: ${projResp.status}`,
            );
          }
        });
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
