import * as v from 'valibot';
export const UserOAuthAccountSchema = v.object({
  id: v.union([v.string(), v.bigint()]),
  userId: v.union([v.string(), v.bigint()]),
  provider: v.string(),
  // providerId: v.string(),
  username: v.nullable(v.string()),
  displayName: v.nullable(v.string()),
  avatar_url: v.nullable(v.string()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export const UserProfileSchema = v.object({
  id: v.union([v.string(), v.bigint()]),
  username: v.string(),
  email: v.string(),
  mobile: v.nullable(v.string()),
  country: v.nullable(v.string()),
  createdAt: v.date(),
  updatedAt: v.date(),
  oauthAccounts: v.array(UserOAuthAccountSchema),
});

export type UserProfile = v.InferOutput<typeof UserProfileSchema>;
export type UserOAuthAccount = v.InferOutput<typeof UserOAuthAccountSchema>;
