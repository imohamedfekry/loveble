import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { streamText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { captureErrors } from 'src/common/utils/capture-errors';
import { QUEUE_NAMES } from '../queue.constants';
import type { CreateProjectJobData } from '../queue.types';

@Processor(QUEUE_NAMES.CREATE_PROJECT)
export class CreateProjectProcessor extends WorkerHost {
  async process(job: Job<CreateProjectJobData>) {
    return captureErrors(
      async () => {
        const prompt = job.data.prompt;
        if (!prompt) {
          throw new Error('create-project job requires a prompt');
        }

        const modelId =
          (job.data.model as ModelId) ?? 'google:gemini-2.5-flash';
        const model = getModel(modelId);

        const result = await streamText({
          model,
          prompt: `Understand the user's intent and generate the most suitable short name for it (max 50 chars). Return only the name, nothing else: "${prompt}"`,
        });

        let projectName = '';
        for await (const chunk of result.textStream) {
          projectName += chunk;
        }

        return {
          success: true,
          projectName: projectName.trim(),
        };
      },
      { queue: QUEUE_NAMES.CREATE_PROJECT, jobId: job.id, jobName: job.name },
    );
  }
}
