import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeEmitService {
  private readonly logger = new Logger(RealtimeEmitService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  private serializeBigInt(data: unknown): unknown {
    // تحويل BigInt إلى string دون فقدان باقي الأنواع (Date, null...)
    return JSON.parse(
      JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
    );
  }

  private ensureServer(): boolean {
    if (!this.gateway?.server) {
      this.logger.warn('RealtimeGateway server not ready, emit skipped');
      return false;
    }
    return true;
  }

  toUser(userId: string | bigint, event: string, data: unknown) {
    if (!this.ensureServer()) return;
    const uid = String(userId);
    try {
      this.gateway.server.to(`user:${uid}`).emit(event, this.serializeBigInt(data));
    } catch (err) {
      this.logger.error(`toUser failed user=${uid} event=${event}: ${err}`);
    }
  }

  toProject(projectId: string | bigint, event: string, data: unknown) {
    if (!this.ensureServer()) return;
    const pid = String(projectId);
    try {
      this.logger.debug(`Emit to project:${pid} event=${event}`);
      this.gateway.server.to(`project:${pid}`).emit(event, this.serializeBigInt(data));
    } catch (err) {
      this.logger.error(`toProject failed project=${pid} event=${event}: ${err}`);
    }
  }

  toFile(fileId: string | bigint, event: string, data: unknown) {
    if (!this.ensureServer()) return;
    const fid = String(fileId);
    try {
      this.gateway.server.to(`file:${fid}`).emit(event, this.serializeBigInt(data));
    } catch (err) {
      this.logger.error(`toFile failed file=${fid} event=${event}: ${err}`);
    }
  }
}
