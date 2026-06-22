"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { githubCallback } from "@/lib/api/auth";
import { BrandPageShell } from "@/components/layout/brand-page-shell";

type Status = "loading" | "success" | "error";

const statusConfig = {
  loading: {
    title: "Connecting GitHub…",
    icon: Loader2Icon,
    iconClassName: "animate-spin text-muted-foreground",
    ringClassName: "bg-muted",
    titleClassName: "text-foreground",
  },
  success: {
    title: "GitHub Connected!",
    icon: CheckIcon,
    iconClassName: "text-green-500",
    ringClassName: "bg-green-500/15",
    titleClassName: "text-green-500",
  },
  error: {
    title: "Connection Failed",
    icon: XIcon,
    iconClassName: "text-destructive",
    ringClassName: "bg-destructive/15",
    titleClassName: "text-destructive",
  },
} as const;

export default function CallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const called = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Connecting your GitHub account…");

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing OAuth parameters. Please try again.");
      setTimeout(() => router.replace("/dashboard?error=github_failed"), 2500);
      return;
    }

    githubCallback(code, state)
      .then(() => {
        setStatus("success");
        setMessage("GitHub connected! Redirecting…");
        router.replace("/dashboard?github=linked");
      })
      .catch((err: Error) => {
        setStatus("error");
        setMessage(
          err.message || "GitHub connection failed. Please try again.",
        );
        setTimeout(
          () => router.replace("/dashboard?error=github_failed"),
          2500,
        );
      });
  }, [params, router]);

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <BrandPageShell>
      <div className="surface-card w-full space-y-5 p-6 text-center shadow-lg">
        <div
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full transition-colors duration-500",
            config.ringClassName,
          )}
        >
          <Icon className={cn("size-8", config.iconClassName)} />
        </div>

        <div className="space-y-1">
          <h1 className={cn("text-lg font-semibold", config.titleClassName)}>
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {status === "loading" && (
          <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-primary/40" />
          </div>
        )}
      </div>
    </BrandPageShell>
  );
}
