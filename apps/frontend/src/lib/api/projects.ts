import { API_BASE_URL } from "../api";
import type { ApiResponse, PaginatedProjects } from "../types/types";

export type GetProjectsParams = {
  page?: number;
  limit?: number;
  recent?: boolean;
};

export async function getProjects(
  params?: GetProjectsParams
): Promise<ApiResponse<PaginatedProjects>> {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }

  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  if (params?.recent) {
    search.set("recent", "true");
  }

  const query = search.toString();

  const empty = {
    items: [] as PaginatedProjects["items"],
    pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
  };

  const response = await fetch(
    `${API_BASE_URL}/projects/all${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      success: false,
      message: json?.message ?? `Request failed (${response.status})`,
      data: empty,
    };
  }

  if (!json) {
    return { success: false, message: "Invalid response", data: empty };
  }

  // Backend returns { data: { projects: [...] } }
  if (json.data && Array.isArray(json.data.projects)) {
    const projects = json.data.projects;
    return {
      success: json.success ?? true,
      message: json.message ?? "",
      data: {
        items: projects,
        pagination: {
          page: 1,
          limit: projects.length,
          total: projects.length,
          totalPages: 1,
        },
      },
    } as ApiResponse<PaginatedProjects>;
  }

  // Normalized shape: { data: { items, pagination } }
  if (json.data && json.data.items) {
    return json as ApiResponse<PaginatedProjects>;
  }

  // Direct items or array
  if (json.items) {
    return {
      success: true,
      message: json.message ?? "",
      data: {
        items: json.items,
        pagination: json.pagination ?? { page: 1, limit: json.items.length ?? 0, total: json.items.length ?? 0, totalPages: 1 },
      },
    };
  }

  if (Array.isArray(json)) {
    return {
      success: true,
      message: "",
      data: {
        items: json,
        pagination: { page: 1, limit: json.length, total: json.length, totalPages: 1 },
      },
    };
  }

  return { success: false, message: "Unexpected response shape", data: empty };
}

export async function createProject(name: string) {
  return fetch(`${API_BASE_URL}/project/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  }).then((r) => r.json());
}

export async function updateProjectName(
  projectId: string,
  name: string
) {
  const response = await fetch(
    `${API_BASE_URL}/projects?id=${projectId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name }),
    }
  );

  return response.json();
}