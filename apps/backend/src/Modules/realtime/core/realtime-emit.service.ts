import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeEmitService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private serializeBigInt(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  toUser(userId: string, event: string, data: any) {
    this.gateway.server
      .to(`user:${userId}`)
      .emit(event, this.serializeBigInt(data));
  }

  toProject(projectId: string, event: string, data: any) {
    this.gateway.server
      .to(`project:${projectId}`)
      .emit(event, this.serializeBigInt(data));
  }
}
