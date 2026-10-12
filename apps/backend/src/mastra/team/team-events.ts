import { EventEmitter } from 'node:events';

export type TeamRunPhase = 'prepare' | 'design' | 'review' | 'builder' | 'done';

export type TeamRunStatus = 'start' | 'done' | 'error';

export type TeamRunEvent = {
  runId: string;
  projectId?: string;
  phase: TeamRunPhase;
  status: TeamRunStatus;
  /** Short human-readable detail: the request head, an agent summary, or an error. */
  detail?: string;
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
