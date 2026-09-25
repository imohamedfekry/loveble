import { apiFetch } from "../../api-fetch";

export async function getSuggestion(payload: {
  fileName: string;
  code: string;
  currentLine: string;
  previousLines: string;
  textBeforeCursor: string;
  textAfterCursor: string;
  nextLines: string;
  lineNumber: number;
}) {
  return apiFetch<{ suggestion: string }>(`/ai/suggestion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
