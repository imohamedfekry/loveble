export type AskQuestion = {
  question: string;
  options: string[];
  allowCustom: boolean;
};

function text(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function options(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Reads the questions out of an `ask-user` tool input. The model streams that
 * input, so half-written entries are skipped instead of rendered broken.
 * The batched `questions` shape is the only one the tool accepts now; the older
 * single-question shape is still read so old turns keep rendering.
 */
export function readAskQuestions(input: unknown): AskQuestion[] {
  if (!input || typeof input !== "object") return [];
  const source = input as Record<string, unknown>;
  const questions: AskQuestion[] = [];

  if (Array.isArray(source.questions)) {
    for (const entry of source.questions) {
      if (!entry || typeof entry !== "object") continue;
      const raw = entry as Record<string, unknown>;
      const question = text(raw, "question");
      if (!question) continue;
      questions.push({
        question,
        options: options(raw.options),
        allowCustom: raw.allowCustom !== false,
      });
    }
  }

  if (questions.length === 0) {
    const question = text(source, "question");
    if (question) {
      questions.push({
        question,
        options: options(source.options),
        allowCustom: source.allowCustom !== false,
      });
    }
  }

  return questions;
}

/**
 * The newest `ask-user` call that still waits for an answer. Its card is not
 * part of the thread (it renders above the composer), and it counts as answered
 * as soon as a user message follows it — both live and after a reload.
 */
export function pendingAskQuestions(
  lists: { role?: string; parts?: unknown }[][],
): AskQuestion[] | null {
  let pending: AskQuestion[] | null = null;

  for (const list of lists) {
    for (const message of list) {
      if (message.role === "user") {
        pending = null;
        continue;
      }
      if (!Array.isArray(message.parts)) continue;

      for (const part of message.parts) {
        const candidate = part as {
          type?: unknown;
          toolName?: unknown;
          input?: unknown;
        };
        const isAskPart =
          candidate.type === "tool-ask-user" ||
          (candidate.type === "dynamic-tool" &&
            candidate.toolName === "ask-user");
        if (!isAskPart) continue;

        const questions = readAskQuestions(candidate.input);
        if (questions.length > 0) pending = questions;
      }
    }
  }

  return pending;
}

/** The answers travel as one plain user message, so make it easy to read. */
export function composeAskReply(
  questions: AskQuestion[],
  answers: Record<number, string>,
  skipped: Record<number, boolean>,
) {
  const single = questions.length === 1;
  const lines = questions.flatMap((entry, index) => {
    const answer = answers[index]?.trim();
    if (answer) return [single ? answer : `${index + 1}. ${entry.question} → ${answer}`];
    if (skipped[index]) {
      return [
        single
          ? "Skip this — pick sensible defaults and carry on."
          : `${index + 1}. ${entry.question} → skipped`,
      ];
    }
    return [];
  });

  if (lines.length === 0) {
    return "Skip these questions — pick sensible defaults and carry on.";
  }

  return lines.join("\n");
}
