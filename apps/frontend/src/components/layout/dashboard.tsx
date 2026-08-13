"use client";
import { useState } from "react";
import { ChatBox } from "./chat/ChatBox";
import { ImportDialog } from "./chat/ImportDialog";
import { BackgroundGradient } from "./BackgroundGradient";

export const Dashboard = () => {
  const [value, setValue] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState("/");
  const startImport = () => {
    if (!repo) return;
    setValue(`Import from GitHub: ${repo} (${path})`);
    setImportOpen(false);
  };

  return (
<main className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
  <BackgroundGradient />
      <div className="relative z-10 w-full max-w-3xl">
        <div className="relative mb-6 flex flex-col items-center px-4 text-center md:mb-7">
          <h1 className="flex items-center gap-1 text-2xl font-medium leading-tight opacity-100 transition-opacity duration-(--duration-very-slow) ease-(--ease-smooth-out) motion-reduce:transition-none md:gap-0 md:text-3xl">
            <span className="min-h-6 pt-0.5 sm:min-h-7 md:min-h-8 md:pt-0">
              What are you building?
            </span>
          </h1>
        </div>

        <ChatBox
          value={value}
          onChange={setValue}
          onOpenImport={() => setImportOpen(true)}
        />
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        repo={repo}
        onRepoChange={setRepo}
        path={path}
        onPathChange={setPath}
        onStart={startImport}
      />
    </main>

  );
};
