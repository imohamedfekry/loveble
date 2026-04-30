import { API_BASE_URL } from "../api";

export async function getProjects() {
  return fetch(`${API_BASE_URL}/project`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  }).then((r) => r.json());
}
export async function createProject(name: string) {
  return fetch(`${API_BASE_URL}/project/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  }).then((r) => r.json());
}

// export const updateProject = async (id: string, data: any) => {
//   const res = await api.put(`/project?id=${id}`, data);
//   return res.data;
// };

// export const deleteProject = async (id: string) => {
//   const res = await api.delete(`/project?id=${id}`);
//   return res.data;
// };
