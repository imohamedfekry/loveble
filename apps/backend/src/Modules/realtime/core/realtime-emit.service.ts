import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeEmitService {
  constructor(private readonly gateway: RealtimeGateway) {}

  toUser(userId: string, event: string, data: any) {
    console.log(userId,event,data);
    
    this.gateway.server.to(`user:${userId}`).emit(event, data);
  }

  toProject(projectId: string, event: string, data: any) {
    this.gateway.server.to(`project:${projectId}`).emit(event, data);
  }
}