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
  "
>
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
      onChange={setValue}
    />
  </div>

  <NoiseBackground />
</main>

  );
};
