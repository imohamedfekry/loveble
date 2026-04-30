"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { githubCallback } from "@/lib/api/auth";

type Status = "loading" | "success" | "error";

export default function CallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const called = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Connecting your GitHub account…");

  useEffect(() => {
    // Prevent double-invocation in React Strict Mode
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500 ${
            status === "loading"
              ? "bg-gray-800"
              : status === "success"
                ? "bg-green-500/20"
                : "bg-red-500/20"
          }`}
        >
          {status === "loading" && (
            <svg
              className="animate-spin w-8 h-8 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
          )}
          {status === "success" && (
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {status === "error" && (
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <div>
          <h1
            className={`text-lg font-semibold ${
              status === "loading"
                ? "text-white"
                : status === "success"
                  ? "text-green-400"
                  : "text-red-400"
            }`}
          >
            {status === "loading" && "Connecting GitHub…"}
            {status === "success" && "GitHub Connected!"}
            {status === "error" && "Connection Failed"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">{message}</p>
        </div>

        {/* Progress bar (loading only) */}
        {status === "loading" && (
          <div className="w-48 h-1 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-white/40 rounded-full animate-pulse w-3/4" />
          </div>
        )}
      </div>
    </div>
  );
}
