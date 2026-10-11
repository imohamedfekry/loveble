/**
 * Tracks in-flight server-side build turns (conversation/build) so the
 * "stop generation" endpoint can abort a build that runs entirely in the
 * Inngest worker — the dashboard prompt flow never opens an /ai/chat fetch,
 * so there is no client disconnect to rely on.
 */
const activeBuilds = new Map<string, AbortController>();

export function registerBuildAbort(
  conversationId: string,
  controller: AbortController,
): void {
  activeBuilds.set(conversationId, controller);
}

export function unregisterBuildAbort(conversationId: string): void {
  if (activeBuilds.has(conversationId)) {
    activeBuilds.delete(conversationId);
  }
}

export function abortActiveBuild(conversationId: string): boolean {
  const controller = activeBuilds.get(conversationId);
  if (!controller) return false;
  controller.abort();
  activeBuilds.delete(conversationId);
  return true;
}

export function hasActiveBuild(conversationId: string): boolean {
  return activeBuilds.has(conversationId);
}
