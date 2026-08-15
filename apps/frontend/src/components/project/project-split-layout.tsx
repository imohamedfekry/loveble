"use client";

import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { MessagesSquareIcon } from "lucide-react";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;

export function ProjectSplitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Allotment
        className="flex-1"
        defaultSizes={[
          DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
          DEFAULT_MAIN_SIZE,
        ]}
      >
        <Allotment.Pane
          snap
          minSize={MIN_SIDEBAR_WIDTH}
          maxSize={MAX_SIDEBAR_WIDTH}
          preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
        >
          <div className="flex h-full flex-col border-r border-border bg-card">
            <div className="flex h-8.75 shrink-0 items-center border-b border-border px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conversation
              </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-primary/10 blur-md" />
                <div className="relative flex size-10 items-center justify-center rounded-full border border-border bg-popover">
                  <MessagesSquareIcon className="size-4 text-brand-accent-2" />
                </div>
              </div>

              <p className="text-sm font-medium text-foreground">
                No conversation yet
              </p>

              <p className="max-w-52 text-xs leading-relaxed text-muted-foreground">
                Your AI chat with this project will appear here.
              </p>
            </div>
          </div>
        </Allotment.Pane>

        <Allotment.Pane>
          {children}
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}