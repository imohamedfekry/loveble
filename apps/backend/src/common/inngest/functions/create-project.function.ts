import { Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { getModel } from 'src/ai/providers';
import { inngest } from '../client';
import { DEFAULT_AGENT_MODEL } from '../agents/general.agent';

const log = new Logger('Inngest:create-project');

export const createProjectFunction = inngest.createFunction(
  {
    id: 'create-project',
    name: 'Create project name from prompt',
    retries: 3,
    triggers: [{ event: 'project/create' }],
  },
  async ({ event, step }) => {
    const projectId = String(event.data?.projectId ?? '');
    const prompt = String(event.data?.prompt ?? '');
    const modelId = (event.data?.model ?? DEFAULT_AGENT_MODEL) as string;

    log.log(
      `▶ project/create projectId=${projectId} model=${modelId} prompt="${prompt.slice(0, 120)}"`,
    );

    if (!projectId || !prompt) {
      log.error(`✖ missing projectId or prompt (projectId=${projectId})`);
      throw new Error('create-project job requires projectId and prompt');
    }

    const projectName = await step.run('generate-name', async () => {
      const startedAt = Date.now();
      const model = getModel(modelId);

      const { text } = await generateText({
        model,
        prompt: `
Understand the user's intent and generate the most suitable short name for it.

Requirements:
- Maximum 50 characters.
- Return only the project name.
- No quotes.
- No explanation.
- No markdown.
- Do not return an empty response.

User prompt:
"${prompt}"
        `.trim(),
      });

      const finalName = text.trim();

      if (!finalName) {
        throw new Error('AI generated an empty project name');
      }

      log.log(
        `✓ generate-name "${finalName}" duration=${Date.now() - startedAt}ms`,
      );

      return finalName;
    });

    const response = await step.fetch(
      'http://localhost:3001/api/v1/projects/webhook/generated-name',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          projectId,
          name: projectName,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      log.error(
        `✖ apply-name projectId=${projectId} status=${response.status} error="${error}"`,
      );

      throw new Error(
        `Failed to apply generated project name: ${response.status}`,
      );
    }

    const result = await response.json();

    log.log(
      `✓ apply-name projectId=${projectId} name="${projectName}"`,
    );

    return {
      success: true,
      projectId,
      projectName,
      result,
    };
  },
);