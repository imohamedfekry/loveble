"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";
import { ChatBox } from "./chat/ChatBox";
import { createProject } from "@/lib/api/apis/projects";
import { useProjectsStore } from "@/store/project.store";
import NoiseBackground from "./NoiseBackground";
import { PulseBackground } from "./PulseBackground";

const CREATE_ERROR = "Could not create the project. Please try again.";

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : CREATE_ERROR;
}

export const Dashboard = () => {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSend(payload: { text: string; files: File[] }) {
    if (isSubmitting) return;
    setError(null);

    const text = payload.text.trim();
    if (!text) return;

    setIsSubmitting(true);
    try {
      const res = await createProject({ prompt: text });
      if (res.success && res.project?.id) {
        useProjectsStore.getState().addProject(res.project);
        setValue("");
        router.push(`/project/${res.project.id}`);
      } else {
        setError(res.message || CREATE_ERROR);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border bg-background">
      <PulseBackground />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="relative mb-6 flex flex-col items-center px-4 text-center md:mb-7">
          <h1 className="flex items-center gap-1 text-2xl font-medium leading-tight md:gap-0 md:text-3xl">
            <span className="min-h-6 pt-0.5 sm:min-h-7 md:min-h-8 md:pt-0">
              What are you building?
            </span>
          </h1>
        </div>

        <ChatBox
          value={value}
          onChange={(next) => {
            setValue(next);
            setError(null);
          }}
          onSend={handleSend}
          sending={isSubmitting}
        />

        <div className="mt-4 flex min-h-6 items-center justify-center px-4 text-center">
          {error ? (
            <p
              className="flex items-center gap-2 text-sm text-destructive"
              role="alert"
            >
              <CircleAlertIcon className="size-4 shrink-0" />
              {error}
            </p>
          ) : isSubmitting ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 shrink-0 animate-spin" />
              Creating your project…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Describe your app — a short phrase is enough.
            </p>
          )}
        </div>
      </div>

      <NoiseBackground />
    </main>
  );
};