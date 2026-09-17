import { Module } from '@nestjs/common';
import { RealtimeGateway } from './core/realtime.gateway';
import { ConnectionHandler } from './core/connection.handler';
import { ConnectionManager } from './core/connection.manager';
import { SocketAuthService } from './core/socket-auth.service';
import { RealtimeEmitService } from './core/realtime-emit.service';
import { CollaborationService } from './core/collaboration.service';
import { AwarenessService } from './core/awareness.service';
import { DocumentStateService } from './core/document-state.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    RealtimeGateway,
    ConnectionHandler,
    ConnectionManager,
    SocketAuthService,
    RealtimeEmitService,
    CollaborationService,
    AwarenessService,
    DocumentStateService,
  ],
  exports: [
    RealtimeGateway,
    ConnectionManager,
    RealtimeEmitService,
    CollaborationService,
    AwarenessService,
  ],
})
export class RealtimeModule {}
