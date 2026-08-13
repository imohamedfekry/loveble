import { ArrowRight, ChevronDown, Folder, X } from "lucide-react";
import { MOCK_REPOS } from "./mock-repos";
import { FaGithub } from "react-icons/fa";

export function ImportDialog({
  open,
  onClose,
  repo,
  onRepoChange,
  path,
  onPathChange,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  repo: string;
  onRepoChange: (value: string) => void;
  path: string;
  onPathChange: (value: string) => void;
  onStart: () => void;
}) {
  if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-(--duration-fast) ease-(--ease-smooth-out)"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#141419] p-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-(--duration-fast) ease-(--ease-smooth-out)"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaGithub className="h-5 w-5 text-neutral-200" />
              <h2 className="text-base font-semibold text-neutral-100">Import from GitHub</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 transition-colors duration-(--duration-quick) ease-out hover:bg-neutral-800 hover:text-neutral-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>


        <label className="mb-1.5 block text-xs font-medium text-neutral-400">Repository</label>
        <div className="relative mb-4">
          <select
            value={repo}
            onChange={(e) => onRepoChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-neutral-700 bg-[#1a1a20] px-3 py-2.5 pr-9 text-sm text-neutral-200 outline-none focus:border-neutral-500"
          >
            <option value="">Select a repository…</option>
            {MOCK_REPOS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} · {r.branch}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        </div>

        <label className="mb-1.5 block text-xs font-medium text-neutral-400">Project path</label>
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-neutral-700 bg-[#1a1a20] px-3 py-2.5 focus-within:border-neutral-500">
          <Folder className="h-4 w-4 text-neutral-500" />
          <input
            value={path}
            onChange={(e) => onPathChange(e.target.value)}
            placeholder="/apps/web"
            className="w-full bg-transparent text-sm text-neutral-200 placeholder:text-neutral-500 outline-none"
          />
        </div>
        <p className="mb-5 text-xs text-neutral-500">
          Leave as <span className="text-neutral-400">/</span> to import the whole repository.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-neutral-300 transition-colors duration-(--duration-quick) ease-out hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            disabled={!repo}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-[background-color,transform] duration-(--duration-fast) ease-out hover:bg-neutral-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start import
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}