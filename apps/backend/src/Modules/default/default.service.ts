import { Injectable } from '@nestjs/common';

@Injectable()
export class DefaultService {
  status() {
    return {
      name: 'API Status',
      version: 'v1',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
