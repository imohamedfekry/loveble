"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPreviewStatus, type PreviewStatus } from "@/lib/api/apis/preview";

const POLL_INTERVAL_MS = 2500;

export interface PreviewState {
  status: PreviewStatus;
  url?: string;
  token?: string;
  error?: string;
}

/**
 * Poll the project's preview status while `active`. Stops once the preview is
 * `ready` or `error`; call `reload` to re-check (e.g. after an error or when
 * the user requests a refresh).
 */
export function usePreview(projectId: string, active: boolean) {
  const [state, setState] = useState<PreviewState>({ status: "stopped" });
  const [reloadKey, setReloadKey] = useState(0);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;

      try {
        const result = await getPreviewStatus(projectId, controller.signal);
        if (cancelled) return;
        setState({
          status: result.status,
          url: result.url,
          token: result.token,
          error: result.error,
        });

        if (result.status === "ready" || result.status === "error") return;
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Preview unavailable",
        }));
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      inflight.current?.abort();
    };
  }, [projectId, active, reloadKey]);

  const reload = useCallback(() => {
    setState({ status: "starting" });
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, reload };
}

export { POLL_INTERVAL_MS };
