import { registerAs } from '@nestjs/config';

export interface BifrostConfig {
  baseUrl: string;
  virtualKey: string;
}

export function getBifrostConfig(): BifrostConfig {
  return {
    baseUrl: process.env.BIFROST_BASE_URL!,
    virtualKey: process.env.BIFROST_VIRTUAL_KEY!,
  };
}

export default registerAs('bifrost', getBifrostConfig);
