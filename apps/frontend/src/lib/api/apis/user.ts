import type { User } from "@loveble/types";

import { ApiError, apiRequest } from "../api-fetch";

type LoginResponse = {
  success?: boolean;
  code?: string;
  message?: string;
};

export function loginUser(data: { email: string; password: string }) {
  return apiRequest<LoginResponse>(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<User> {
  const json = await apiRequest<{ data?: { user?: User } }>(`/user/@me`, {
    method: "GET",
  });

  if (!json?.data?.user) {
    throw new ApiError("No user data", 200);
  }

  return json.data.user;
}
