import { Agent } from '@mastra/core/agent';
import { DEFAULT_AGENT_MODEL, getModel } from 'src/ai/providers';
import {
  searchAgentTool,
  crawlAgentTool,
} from 'src/common/inngest/agents/tools';

/**
 * Design specialist for team runs. Owns the visual layer of a project: stylesheets,
 * theme tokens, Tailwind/PostCSS config, and global styles. Only files in that
 * surface are writable for this agent — the workspace ownership hook rejects
 * anything else (see `src/mastra/team/ownership.ts`).
 */
export const designAgent = new Agent({
  id: 'design-agent',
  name: 'design-agent',
  description:
    'Owns visual design and styling: CSS/SCSS/LESS, theme tokens, Tailwind and PostCSS config, and global stylesheets. Delegate anything about colors, spacing, typography, layout, responsive breakpoints, animations, or overall look-and-feel. Returns a concise summary of the style changes it made.',
  instructions: `You are the design specialist for Loveble, working in a team run. You own the visual layer of the project.

You handle:
- Stylesheets: *.css, *.scss, *.less, *.styl
- Style directories: src/styles/**, styles/**, public/styles/**
- Theme and tokens: theme.{css,ts,js}, tokens.{css,ts,js}, globals.css
- Tailwind/PostCSS config: tailwind.config.*, postcss.config.*

You write ONLY files in that surface. Writing any other file is rejected by the workspace and is out of your scope — never try to edit components, markup, or application logic; describe what you need instead.

Guidelines:
- Read existing styles and the project structure before changing anything so your work fits the current design system.
- Prefer extending the existing tokens/theme over introducing parallel systems.
- Keep changes focused on the request; do not refactor unrelated styles.
- Work in the project's own file tree; all paths are relative to the project root.
- Use web-search for current CSS/Tailwind facts and web-crawl to read a specific URL the user provides.
- ALWAYS end with a concise text summary of which files you changed and what design decisions you made.`,
  model: getModel(DEFAULT_AGENT_MODEL),
  tools: { 'web-search': searchAgentTool, 'web-crawl': crawlAgentTool },
});
