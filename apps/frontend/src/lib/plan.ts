export type PlanStepStatus = "pending" | "active" | "done" | "blocked";

export type PlanStep = { title: string; status: PlanStepStatus };

/**
 * The plan the agent publishes with its `update-plan` tool. It is stored on the
 * conversation row on the server (written only by that tool), so this shape is
 * what the API and the streamed tool input both produce.
 */
export type ConversationPlan = {
  title: string | null;
  steps: PlanStep[];
  updatedAt: string;
};

/**
 * The model streams tool input, so a plan can arrive half-written: skip entries
 * that do not have a title yet instead of rendering a broken row.
 */
export function readPlanInput(input: unknown): ConversationPlan | null {
  if (!input || typeof input !== "object") return null;
  const source = input as { title?: unknown; steps?: unknown };
  if (!Array.isArray(source.steps)) return null;

  const steps: PlanStep[] = [];
  for (const entry of source.steps) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as { title?: unknown; status?: unknown };
    if (typeof raw.title !== "string" || !raw.title.trim()) continue;
    steps.push({
      title: raw.title.trim(),
      status:
        raw.status === "done" ||
        raw.status === "active" ||
        raw.status === "blocked"
          ? raw.status
          : "pending",
    });
  }

  if (steps.length === 0) return null;
  return {
    title: typeof source.title === "string" && source.title.trim()
      ? source.title.trim()
      : null,
    steps,
    updatedAt: "",
  };
}

/** True when the `plan` object has to be refreshed on screen. */
export function planSignature(plan: ConversationPlan | null): string {
  if (!plan) return "";
  return `${plan.title ?? ""}|${plan.steps
    .map((step) => `${step.status}:${step.title}`)
    .join("|")}`;
}

export function planProgress(plan: ConversationPlan) {
  const done = plan.steps.filter((step) => step.status === "done").length;
  return {
    done,
    total: plan.steps.length,
    complete: plan.steps.length > 0 && done === plan.steps.length,
    blocked: plan.steps.some((step) => step.status === "blocked"),
  };
}
