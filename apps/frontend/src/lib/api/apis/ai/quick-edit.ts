import { apiFetch } from "../../api-fetch";

export async function quickEdit(payload: {
  selectedCode: string;
  fullCode: string;
  instruction: string;
}) {
  return apiFetch<{ editedCode: string }>(`/ai/quick-edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
