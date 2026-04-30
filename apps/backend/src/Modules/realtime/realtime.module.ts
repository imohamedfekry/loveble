import { Module } from '@nestjs/common';
import { RealtimeGateway } from './core/realtime.gateway';
import { ConnectionHandler } from './core/connection.handler';
import { ConnectionManager } from './core/connection.manager';
import { SocketAuthService } from './core/socket-auth.service';
import { RealtimeEmitService } from './core/realtime-emit.service';

@Module({
  providers: [
    RealtimeGateway,
    ConnectionHandler,
    ConnectionManager,
    SocketAuthService,
    RealtimeEmitService,
  ],
  exports: [RealtimeGateway, ConnectionManager,RealtimeEmitService],
})
export class RealtimeModule {}