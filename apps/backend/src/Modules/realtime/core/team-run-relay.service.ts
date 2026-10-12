import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { teamRunEvents, type TeamRunEvent } from 'src/mastra/team/team-events';
import { TEAM_EVENTS } from '../events/team.events';
import { RealtimeEmitService } from './realtime-emit.service';

/**
 * Bridges team-run progress out of Mastra and onto the project's socket room.
 * The workflow publishes to an in-process bus (so Mastra code stays free of
 * Nest imports); this service is the single place that turns those events into
 * `team:run` emissions the frontend monitor panel renders.
 */
@Injectable()
export class TeamRunRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TeamRunRelayService.name);
  private unsubscribe?: () => void;

  constructor(private readonly emit: RealtimeEmitService) {}

  onModuleInit(): void {
    this.unsubscribe = teamRunEvents.subscribe((event) => this.relay(event));
    this.logger.log('subscribed to team-run events');
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private relay(event: TeamRunEvent): void {
    if (!event.projectId) {
      this.logger.debug(
        `dropped team event without projectId phase=${event.phase}`,
      );
      return;
    }
    this.emit.toProject(event.projectId, TEAM_EVENTS.RUN, event);
  }
}
