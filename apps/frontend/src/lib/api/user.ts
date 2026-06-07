import { API_BASE_URL } from "../api"
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
  const res = await fetch(`${API_BASE_URL}/user/@me`, {
    credentials: 'include',
  });

  const json = await res.json();

  return json.data.user; 
}