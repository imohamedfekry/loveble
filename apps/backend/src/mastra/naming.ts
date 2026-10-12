import * as v from 'valibot';
import { valibotSchema } from '@ai-sdk/valibot';
import { createNamingAgent } from './agents/naming.agent';

export const ProjectNameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.nonEmpty('Name is required'),
    v.maxLength(80, 'Name cannot exceed 80 characters'),
  ),
});

export const ConversationTitleSchema = v.object({
  title: v.pipe(
    v.string(),
    v.nonEmpty('Title is required'),
    v.maxLength(255, 'Title cannot exceed 255 characters'),
  ),
});

export const ProjectAndConversationNamesSchema = v.object({
  projectName: v.pipe(
    v.string(),
    v.nonEmpty('Project name is required'),
    v.maxLength(80, 'Project name cannot exceed 80 characters'),
  ),
  conversationTitle: v.pipe(
    v.string(),
    v.nonEmpty('Conversation title is required'),
    v.maxLength(255, 'Conversation title cannot exceed 255 characters'),
  ),
});

export type ProjectNameOutput = v.InferOutput<typeof ProjectNameSchema>;
export type ProjectAndConversationNames = v.InferOutput<typeof ProjectAndConversationNamesSchema>;

export async function generateProjectName(
  prompt: string,
  modelId?: string,
): Promise<string> {
  const agent = createNamingAgent(modelId);
  const { object } = await agent.generate(
    `Write a concise descriptive title (max 80 characters) that summarizes what the project does, based on the user's request. This must be a short DESCRIPTION of the project — NOT a brand, product, or invented name. Write it in the same language as the user's request: if the user wrote in English, write the title in English; if the user wrote in Arabic, write the title in Arabic. Return only the title, no explanation, no markdown, no quotes.

User request:
"${prompt}"`,
    {
      structuredOutput: {
        schema: valibotSchema(ProjectNameSchema),
        jsonPromptInjection: true,
      },
    },
  );
  return object.name;
}

export async function generateConversationTitle(
  text: string,
  modelId?: string,
): Promise<string> {
  const agent = createNamingAgent(modelId);
  const { object } = await agent.generate(
    `Generate a short conversation title (max 255 characters) based on the first user message. Write it in the same language as the user's first message: if the user wrote in English, write the title in English; if the user wrote in Arabic, write the title in Arabic. Return only the title, no explanation.

First user message:
"${text}"`,
    {
      structuredOutput: {
        schema: valibotSchema(ConversationTitleSchema),
        jsonPromptInjection: true,
      },
    },
  );
  return object.title;
}

export async function generateNames(
  prompt: string,
  modelId?: string,
): Promise<ProjectAndConversationNames> {
  const agent = createNamingAgent(modelId);
  const { object } = await agent.generate(
    `Write two things based on the user's request, in the EXACT same language as the user's request.

Return a JSON object with keys:
- projectName: a concise descriptive project title (max 80 characters). This is a short DESCRIPTION of what the project does — NOT a brand, product, or invented name.
- conversationTitle: a short conversation title (max 255 characters) summarizing the first user message.

Return only the JSON object, no explanation, no markdown, no quotes.

User request:
"${prompt}"`,
    {
      structuredOutput: {
        schema: valibotSchema(ProjectAndConversationNamesSchema),
        jsonPromptInjection: true,
      },
    },
  );
  return object;
}
