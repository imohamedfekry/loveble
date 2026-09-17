import { Injectable } from '@nestjs/common';
import { streamText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { MAX_SCAFFOLD_FILES, parseScaffoldResponse } from './scaffold.parser';
import type { Scaffold } from './scaffold.types';

const DEFAULT_MODEL_ID: ModelId = 'google:gemini-2.5-flash';

@Injectable()
export class ScaffoldPrompter {
  private readonly modelId: ModelId = DEFAULT_MODEL_ID;

  async generate(
    prompt: string,
    modelId: ModelId = this.modelId,
  ): Promise<Scaffold> {
    const result = streamText({
      model: getModel(modelId),
      prompt: `${this.buildInstructions()}\n\nUser request: "${prompt}"`,
    });

    let raw = '';
    for await (const chunk of result.textStream) {
      raw += chunk;
    }

    return parseScaffoldResponse(raw);
  }

  private buildInstructions(): string {
    return [
      'You scaffold small starter projects. Return ONLY valid JSON.',
      'No markdown fences, no commentary, no trailing text.',
      'Emit exactly this shape: {"name":"<short project name>","files":[{"path":"<relative path like src/main.ts or index.html>","content":"<file source>"}]}.',
      `Rules: at most ${MAX_SCAFFOLD_FILES} files; prefer the smallest sensible multi-file structure (for web apps: index.html + style.css + app.js or src/App.tsx + ...);`,
      'escape double quotes and backslashes in content properly; name must be <= 40 chars.',
    ].join(' ');
  }
}
