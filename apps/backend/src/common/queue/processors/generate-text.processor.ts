import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { generateText as aiGenerateText, stepCountIs } from 'ai';
import { Job } from 'bullmq';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { crawlTool } from 'src/ai/tools/crawl.tool';
import { searchTool } from 'src/ai/tools/webSearch.tool';
import { captureErrors } from 'src/common/utils/capture-errors';
import { QUEUE_NAMES } from '../queue.constants';
import type { GenerateTextJobData } from '../queue.types';

@Processor(QUEUE_NAMES.GENERATE_TEXT)
export class GenerateTextProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateTextProcessor.name);

  async process(job: Job<GenerateTextJobData>) {
    return captureErrors(
      async () => {
        const prompt = job.data.prompt;
        if (!prompt) {
          throw new Error('generate-text job requires a prompt');
        }

        const modelId =
          (job.data.model as ModelId) ?? 'google:gemini-2.5-flash';
        const model = getModel(modelId);

        const result = await aiGenerateText({
          model,
          prompt,
          tools: { searchTool, crawlTool },
          stopWhen: stepCountIs(13),
          experimental_onToolCallStart: async ({ toolCall }) => {
            this.logger.log({
              msg: `[AI:TOOL] USED ${toolCall.toolName}`,
              tool: toolCall.toolName,
              input: (toolCall as { input?: unknown }).input,
            });
          },
        });

        return {
          success: true,
          model: modelId,
          response: result.text,
        };
      },
      { queue: QUEUE_NAMES.GENERATE_TEXT, jobId: job.id, jobName: job.name },
    );
  }
}
