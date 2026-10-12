import { apiFetch } from "../../api-fetch";

export async function quickEdit(payload: {
  projectId: string;
  fileId: string;
  instruction: string;
  startLine?: number;
  endLine?: number;
  signal?: AbortSignal;
}) {
  const { signal, ...body } = payload;

  return apiFetch<{ ok: boolean; path?: string }>(
    `/ai/quick-edit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    // The agent reads + edits the file (several model/tool steps), so this can
    // take far longer than the default request timeout.
    { timeoutMs: 180000 },
  );
}
