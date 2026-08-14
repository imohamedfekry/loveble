"use client";
import { cn } from "@/lib/utils";
import { BackgroundGradient } from "./BackgroundGradient";
type ConnectionLoadingProps = {
  message?: string;
  className?: string;
};
export function ConnectionLoading({
  message = "Loading loveble...",
  className,
}: ConnectionLoadingProps) {
  return (
<div
  role="status"
  aria-live="polite"
  className={cn(
    "relative flex h-full w-full flex-col items-center justify-center overflow-hidden gap-5 bg-[#141419]",
    className
  )}
>
  <BackgroundGradient />

  <img
    src="/logo.svg"
    alt="loveble"
    draggable={false}
    className="relative z-10 size-16 select-none animate-[loveble-pulse_2s_ease-in-out_infinite]"
  />

  <h1 className="relative z-10 text-primary-pulse flex items-center gap-1 text-2xl font-medium leading-tight opacity-100 transition-opacity duration-(--duration-very-slow) ease-(--ease-smooth-out) motion-reduce:transition-none md:gap-0 md:text-3xl">
    <span className="min-h-6 pt-0.5 sm:min-h-7 md:min-h-8 md:pt-0">
      {message}
    </span>
  </h1>
</div>
  );
}