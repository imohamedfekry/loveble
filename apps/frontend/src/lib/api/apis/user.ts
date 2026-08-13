import { API_BASE_URL } from "@/lib/api";

export async function loginUser(data: any) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  return res.json()
}

export async function getMe() {
    try {
      const res = await fetch(`${API_BASE_URL}/user/@me`, {
        credentials: 'include',
      });

      if (!res.ok) {
        console.error(`[getMe] HTTP ${res.status}:`, res.statusText);
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (!json.data?.user) {
        console.error("[getMe] No user data in response:", json);
        throw new Error("No user data");
      }

      return json.data.user;
    } catch (err) {
      console.error("[getMe] Error fetching user:", err);
      throw err;
    }
  }