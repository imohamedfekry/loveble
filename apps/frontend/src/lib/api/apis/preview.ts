import { apiRequest } from "../api-fetch";

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
  error?: string;
  message?: string;
}

type PreviewStatusPayload = {
  success?: boolean;
  message?: string;
  data?: { status?: PreviewStatus; url?: string; error?: string };
  status?: PreviewStatus;
  url?: string;
  error?: string;
};

export async function getPreviewStatus(
  projectId: string,
  signal?: AbortSignal,
): Promise<PreviewStatusResult> {
  try {
    const json = await apiRequest<PreviewStatusPayload>(
      `/preview/${projectId}/status`,
      { method: "GET", signal },
    );

    const data = json.data ?? json;

    return {
      success: json.success ?? true,
      status: data.status ?? "error",
      url: data.url,
      error: data.error,
      message: json.message,
    };
  } catch (error: unknown) {
    return {
      success: false,
      status: "error",
      error:
        error instanceof Error && error.message
          ? error.message
          : "Failed to load the preview status",
    };
  }
}
