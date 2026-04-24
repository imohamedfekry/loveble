import type { User } from 'src/common/database/schema';

export type AuthenticatedUser = User;

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
