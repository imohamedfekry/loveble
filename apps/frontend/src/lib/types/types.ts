export type ImportStatus = "importing" | "completed" | "failed";
export type ExportStatus = "exporting" | "completed" | "failed";

export type Project = {
  id: string;
  name: string;
  userId: string;
  importStatus: ImportStatus;
  exportStatus: ExportStatus | null;
  exportRepoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedProjects = {
  items: Project[];
  pagination: Pagination;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type UserOAuthAccount = {
  id: string;
  provider: "github" | "google" | string;
  // providerId: string;
  username: string;
  displayName: string;
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

export interface UserStore {
  user: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  finishLoading: () => void;
}