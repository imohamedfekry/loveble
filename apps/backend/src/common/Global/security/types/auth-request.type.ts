import type { FastifyRequest } from 'fastify';
import type { User } from '../../../database/schema';

export type AuthenticatedUser = User;

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthenticatedUser;
};