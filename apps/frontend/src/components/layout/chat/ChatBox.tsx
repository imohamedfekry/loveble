import { ArrowUp, ChevronDown, Mic, Plus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";

export function ChatBox({
  value,
  onChange,
  onOpenImport,
}: {
  value: string;
  onChange: (value: string) => void;
  onOpenImport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const height = Math.min(el.scrollHeight, 220);
    el.style.height = `${height}px`;
    el.style.overflowY = height >= 220 ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value]);

  const openImport = () => {
    setMenuOpen(false);
    onOpenImport();
  };

  return (
    <div className="animated-gradient-border rounded-3xl p-[1.5px]">
      <div className="rounded-[22px] bg-[#141419] p-4">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask Squadra to build a prototype... "
          className="block w-full resize-none overflow-hidden bg-transparent outline-none text-[17px] leading-7 placeholder:text-neutral-500 max-h-55 min-h-9"
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-11 left-0 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-[#1a1a20] shadow-xl">
                <button
                  onClick={openImport}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-800"
                >
                  <FaGithub className="h-4 w-4" />
                  Import from GitHub
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-neutral-800">
              Build
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-800">
              <Mic className="h-4 w-4" />
            </button>

            {value.trim() && (
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}