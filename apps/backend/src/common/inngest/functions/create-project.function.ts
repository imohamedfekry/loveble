import { Logger } from '@nestjs/common';
import { inngest } from '../client';
import { getNestApp } from '../nest-context';
import { streamText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { DEFAULT_AGENT_MODEL } from '../agents/general.agent';
import { projectService } from 'src/Modules/project/project.service';

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
    const modelId = (event.data?.model ?? DEFAULT_AGENT_MODEL) as ModelId;

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
      const result = streamText({
        model,
        prompt: `Understand the user's intent and generate the most suitable short name for it (max 50 chars). Return only the name, nothing else: "${prompt}"`,
      });

      let name = '';
      for await (const chunk of result.textStream) {
        name += chunk;
      }

      const finalName = name.trim();
      log.log(
        `✓ generate-name "${finalName}" duration=${Date.now() - startedAt}ms`,
      );
      return finalName;
    });

    return step.run('apply-name', async () => {
      const app = getNestApp();
      const service = app.get(projectService);
      const updated = await service.applyGeneratedName(projectId, projectName);
      log.log(
        `${updated ? '✓' : '✖'} apply-name projectId=${projectId} name="${projectName}"`,
      );
      return {
        success: Boolean(updated),
        projectId,
        projectName,
      };
    });
  },
);
