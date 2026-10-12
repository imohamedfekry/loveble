import { Injectable } from '@nestjs/common';
import { RequestContext } from '@mastra/core/request-context';
import { quickEditAgent } from 'src/mastra/agents/quick-edit.agent';

@Injectable()
export class AiService {
  /**
   * Runs the quick-edit agent over a project file. The agent edits the real file
   * through its build-mode workspace (routed through the collaboration pipeline),
   * exactly like the builder agent in chat — no chat message is created.
   */
  async quickEditProjectFile(params: {
    projectId: string;
    userId: string;
    path: string;
    instruction: string;
    selection?: { startLine: number; endLine: number };
    documentation?: string;
    abortSignal?: AbortSignal;
  }): Promise<string> {
    const requestContext = new RequestContext<{
      projectId: string;
      conversationId: string;
      userId: string;
      mode: 'build';
    }>([
      ['projectId', params.projectId],
      ['conversationId', `quick-edit-${params.path}`],
      ['userId', params.userId],
      ['mode', 'build'],
    ]);

    const selection = params.selection
      ? `The developer has lines ${params.selection.startLine}-${params.selection.endLine} selected for context.`
      : 'The developer has no specific selection.';

    const prompt = [
      'Apply a quick edit to a project file.',
      '',
      `Target file: ${params.path}`,
      selection,
      '',
      'Instruction:',
      params.instruction,
    ].join('\n');

    const withDocs = params.documentation
      ? `${prompt}\n\nDocumentation Context:\n${params.documentation}`
      : prompt;

    const result = await quickEditAgent.generate(
      [{ role: 'user', content: withDocs }],
      {
        requestContext,
        maxSteps: 20,
        abortSignal: params.abortSignal,
      },
    );

    return result.text ?? '';
  }
}
