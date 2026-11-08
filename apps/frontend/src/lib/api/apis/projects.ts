import type {
  ApiResponse,
  PaginatedProjects,
  Pagination,
  Project,
} from "@loveble/types";

import { ApiError, apiRequest } from "../api-fetch";

export type GetProjectsParams = {
  page?: number;
  limit?: number;
  recent?: boolean;
  signal?: AbortSignal;
};

/** Backend envelope for the project endpoints. */
type ProjectsPayload = {
  projects?: Project[];
  items?: Project[];
  pagination?: Partial<Pagination>;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

type ProjectsEnvelope = {
  success?: boolean;
  code?: string;
  message?: string;
  data?: ProjectsPayload;
};

type MutationEnvelope = {
  success?: boolean;
  code?: string;
  message?: string;
  errors?: { field?: string; message?: string }[];
  data?: Record<string, unknown>;
};

// The backend caps `limit`; ask for a large page and walk the pages instead of
// presenting page 1 as the complete list.
const ALL_PAGE_LIMIT = 100;
const MAX_ALL_PAGES = 20;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.errors?.[0]?.message ?? error.message ?? fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function emptyPage(page: number, limit: number): PaginatedProjects {
  return {
    items: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}

type PageResult = {
  success: boolean;
  message: string;
  items: Project[];
  pagination: Pagination;
};

async function fetchProjectsPage(params: {
  page: number;
  limit: number;
  recent: boolean;
  signal?: AbortSignal;
}): Promise<PageResult> {
  const search = new URLSearchParams();

  if (params.recent) {
    search.set("recent", "true");
  } else {
    search.set("page", String(params.page));
    search.set("limit", String(params.limit));
  }

  const json = await apiRequest<ProjectsEnvelope>(
    `/projects/all?${search.toString()}`,
    { method: "GET", signal: params.signal },
  );

  const payload = json.data ?? {};
  const items = Array.isArray(payload.projects)
    ? payload.projects
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  // `recent` returns the newest slice without pagination; the paginated
  // endpoint returns real page/limit/total/totalPages values.
  const pagination: Pagination = {
    page: toNumber(payload.pagination?.page ?? payload.page, params.page),
    limit: toNumber(payload.pagination?.limit ?? payload.limit, params.limit),
    total: toNumber(payload.pagination?.total ?? payload.total, items.length),
    totalPages: toNumber(
      payload.pagination?.totalPages ?? payload.totalPages,
      params.recent ? 1 : Math.max(1, Math.ceil(items.length / params.limit)),
    ),
  };

  return {
    success: json.success ?? true,
    message: json.message ?? "",
    items,
    pagination,
  };
}

export async function getProjects(
  params?: GetProjectsParams,
): Promise<ApiResponse<PaginatedProjects>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const recent = params?.recent === true;

  try {
    // A specific page/limit (or the recent slice) is one request.
    if (recent || params?.page || params?.limit) {
      const result = await fetchProjectsPage({
        page,
        limit,
        recent,
        signal: params?.signal,
      });

      return {
        success: result.success,
        message: result.message,
        data: { items: result.items, pagination: result.pagination },
      };
    }

    // "all" means every project: follow the backend's page count.
    const items: Project[] = [];
    let pagination: Pagination = {
      page: 1,
      limit: ALL_PAGE_LIMIT,
      total: 0,
      totalPages: 1,
    };
    let success = true;
    let message = "";

    for (let current = 1; current <= MAX_ALL_PAGES; current += 1) {
      const result = await fetchProjectsPage({
        page: current,
        limit: ALL_PAGE_LIMIT,
        recent: false,
        signal: params?.signal,
      });

      success = result.success;
      message = result.message;
      items.push(...result.items);
      pagination = result.pagination;

      if (result.items.length === 0 || current >= result.pagination.totalPages) {
        break;
      }
    }

    return {
      success,
      message,
      data: {
        items,
        pagination: {
          page: 1,
          limit: items.length,
          total: pagination.total,
          totalPages: pagination.totalPages,
        },
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to load projects"),
      data: emptyPage(page, limit),
    };
  }
}

export async function getProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<Project> {
  const json = await apiRequest<{
    data?: { project?: Project };
  }>(`/projects/project/${projectId}`, {
    method: "GET",
    signal,
  });

  const project = json?.data?.project;
  if (!project?.id) {
    throw new ApiError("Invalid project data", 200);
  }

  return project;
}

export type CreateProjectResult = {
  success: boolean;
  message: string;
  project?: Project | undefined;
};

export async function createProject(body: {
  name?: string;
  prompt?: string;
}): Promise<CreateProjectResult> {
  try {
    const json = await apiRequest<MutationEnvelope>(`/projects/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    return {
      success: json.success ?? true,
      message: json.message ?? "",
      project: json.data?.project as Project | undefined,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to create the project"),
    };
  }
}

export async function updateProjectName(projectId: string, name: string) {
  try {
    const json = await apiRequest<MutationEnvelope>(
      `/projects?id=${encodeURIComponent(projectId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );

    return {
      success: json.success ?? true,
      message: json.message ?? "",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to rename the project"),
    };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const json = await apiRequest<MutationEnvelope>(
      `/projects?id=${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    );

    return {
      success: json.success ?? true,
      message: json.message ?? "",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to delete the project"),
    };
  }
}

export type OpenProjectResult = {
  success: boolean;
  message: string;
  sandboxId?: string;
  status?: "running" | "paused";
  created?: boolean;
};

export async function openProject(
  projectId: string,
): Promise<OpenProjectResult> {
  try {
    const json = await apiRequest<
      MutationEnvelope & {
        sandboxId?: string;
        status?: "running" | "paused";
        created?: boolean;
        data?: {
          sandboxId?: string;
          status?: "running" | "paused";
          created?: boolean;
        };
      }
    >(`/projects/project/${encodeURIComponent(projectId)}/open`, {
      method: "GET",
    });

    return {
      success: json.success ?? true,
      message: json.message ?? "",
      sandboxId: json.data?.sandboxId ?? json.sandboxId,
      status: json.data?.status ?? json.status,
      created: json.data?.created ?? json.created,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to start the environment"),
    };
  }
}
