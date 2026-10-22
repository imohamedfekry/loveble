import { API_BASE_URL } from "../../api";

export type PreviewStatus =
  | "stopped"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface PreviewStatusResult {
  success: boolean;
  status: PreviewStatus;
  url?: string;
  token?: string;
  error?: string;
  message?: string;
}

export async function getPreviewStatus(
  projectId: string,
  signal?: AbortSignal,
): Promise<PreviewStatusResult> {
  const response = await fetch(
    `${API_BASE_URL}/preview/${projectId}/status`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal,
    },
  );

  const json = await response.json().catch(() => null);

  if (!response.ok || !json) {
    return {
      success: false,
      status: "error",
      error: json?.message ?? `Request failed (${response.status})`,
    };
  }

  const data = json.data ?? json;

  return {
    success: json.success ?? true,
    status: (data.status as PreviewStatus) ?? "error",
    url: data.url,
    token: data.token,
    error: data.error,
    message: json.message,
  };
}
