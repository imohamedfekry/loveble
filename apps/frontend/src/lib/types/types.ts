export type Project = {
  id: string;
  name: string;
  userId: string;
  importStatus: string;
  createdAt: string;
};
export type UserOAuthAccount = {
  id: string;
  provider: "github" | "google" | string;
  providerId: string;
  avatar_url: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};
export type User = {
  id: string;
  username: string;
  email: string;
  mobile: string | null;
  country: string | null;

  createdAt: string;
  updatedAt: string;

  oauthAccounts: UserOAuthAccount[];
};
export type UserStore = {
  user: User | null;
  setUser: (u: User) => void;
};