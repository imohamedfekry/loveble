import { API_BASE_URL } from "../api";

export function redirectToGithubConnect() {
  window.location.href = `${API_BASE_URL}/auth/github/connect`;
}

export async function githubCallback(code: string, state: string) {
  const params = new URLSearchParams({ code, state });
  const res = await fetch(
    `${API_BASE_URL}/auth/github/callback?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message ?? "GitHub callback failed");
  }

  return res.json() as Promise<{
    success: boolean;
    data?: { provider: string; linked: boolean };
  }>;
}

export async function requestOtp(email: string) {
  return fetch(`${API_BASE_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then((r) => r.json());
}

export async function verifyOtp(email: string, otp: string) {
  return fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  }).then((r) => r.json());
}

export async function createAccount(data: { name: string; password: string }) {
  return fetch(`${API_BASE_URL}/auth/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((r) => r.json());
}
