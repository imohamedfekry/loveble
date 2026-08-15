"use client";
import { useState } from "react";
import { ChatBox } from "./chat/ChatBox";
import NoiseBackground from "./NoiseBackground";
import { PulseBackground } from "./PulseBackground";

export const Dashboard = () => {
  const [value, setValue] = useState("");

  return (
<main
  className="
    relative
    flex
    min-h-full
    w-full
    flex-1
    items-center
    justify-center
    overflow-hidden
    rounded-2xl
    border
    bg-background
    shadow-[0px_0px_0px_var(--border-default)_rgba(119,119,113,var(--shadow-surface-border-alpha)),0px_0px_0px_var(--border-default)_var(--surface-shadow-base,var(--background-color-primary-pulse)),0px_0px_0px_calc(var(--border-default)*2)_#00000029,0px_calc(1px+var(--border-default))_0px_0px_#00000014,0px_calc(1px+var(--border-default))_1px_-0.5px_#00000014,0px_calc(3px+var(--border-default))_3px_-1.5px_#00000014,0px_calc(6px+var(--border-default))_6px_-3px_#00000014,0px_calc(12px+var(--border-default))_12px_-6px_#00000014,0px_calc(24px+var(--border-default))_24px_-12px_#00000014]
  "
>
  <PulseBackground />

  <div className="relative z-10 w-full max-w-3xl">
    <div className="relative mb-6 flex flex-col items-center px-4 text-center md:mb-7">
      <h1 className="flex items-center gap-1 text-2xl font-medium leading-tight  duration-(--duration-very-slow) ease-(--ease-smooth-out) motion-reduce:transition-none md:gap-0 md:text-3xl">
        <span className="min-h-6 pt-0.5 sm:min-h-7 md:min-h-8 md:pt-0">
          What are you building?
        </span>
      </h1>
    </div>

    <ChatBox
      value={value}
      onChange={setValue}
    />
  </div>

  <NoiseBackground />
</main>

  );
};
