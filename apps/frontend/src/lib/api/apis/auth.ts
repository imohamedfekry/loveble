import { API_BASE_URL } from "../../api";
import { apiRequest } from "../api-fetch";

export type AuthResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  data?: unknown;
};

export type GitHubCallbackResponse = {
  success: boolean;
  data?: { provider: string; linked: boolean };
};

export function redirectToGithubConnect() {
  window.location.href = `${API_BASE_URL}/auth/github/connect`;
}

export function githubCallback(code: string, state: string) {
  const params = new URLSearchParams({ code, state });
  return apiRequest<GitHubCallbackResponse>(
    `/auth/github/callback?${params.toString()}`,
    { method: "GET" },
  );
}

export function requestOtp(email: string) {
  return apiRequest<AuthResponse>(`/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, otp: string) {
  return apiRequest<AuthResponse>(`/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
}

export function createAccount(data: { name: string; password: string }) {
  return apiRequest<AuthResponse>(`/auth/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
