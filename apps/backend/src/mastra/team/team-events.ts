import { EventEmitter } from 'node:events';

export type TeamRunPhase = 'prepare' | 'design' | 'review' | 'builder' | 'done';

export type TeamRunStatus = 'start' | 'done' | 'error';

/**
 * One tool an agent called during a team run. `name` is the (workspace-stripped)
 * tool name (e.g. `write_file`) and `target` is the path / query / command it
 * touched, so the UI can show what each specialist actually did.
 */
export type TeamToolCall = {
  name: string;
  target?: string;
};

export type TeamRunEvent = {
  runId: string;
  projectId?: string;
  phase: TeamRunPhase;
  status: TeamRunStatus;
  /** Short human-readable detail: the request head, an agent summary, or an error. */
  detail?: string;
  /** Tools the agent for this phase called (present on `done` events). */
  tools?: TeamToolCall[];
  files?: string[];
};

/**
 * In-process bus for team-run progress. Workflow steps publish here so Mastra
 * code stays free of Nest/realtime imports; the realtime layer (Phase 4)
 * subscribes and re-emits over the `team:run` channel with `RealtimeEmitService`.
 */
class TeamRunEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit(event: TeamRunEvent): void {
    this.emitter.emit('team-run', event);
  }

  subscribe(listener: (event: TeamRunEvent) => void): () => void {
    this.emitter.on('team-run', listener);
    return () => {
      this.emitter.off('team-run', listener);
    };
  }
}

export const teamRunEvents = new TeamRunEventBus();
