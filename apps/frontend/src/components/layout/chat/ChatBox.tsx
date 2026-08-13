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
      <div
        className="cursor-text rounded-[22px] bg-[#141419] p-4"
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask Squadra to build a prototype... "
          className="block w-full resize-none overflow-hidden bg-transparent caret-primary outline-none text-[17px] leading-7 placeholder:text-neutral-500 max-h-55 min-h-9"
        />

        <div
          className="mt-3 flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 transition-[background-color,border-color,transform,scale] duration-(--duration-fast) ease-out hover:bg-neutral-800 active:scale-[0.96]"
            >
              <Plus className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-11 left-0 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-[#1a1a20] shadow-xl">
                <button
                  onClick={openImport}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,color] duration-(--duration-fast) ease-out hover:bg-neutral-800"
                >
                  <FaGithub className="h-4 w-4" />
                  Import from GitHub
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color] duration-(--duration-fast) ease-out hover:bg-neutral-800">
              Build
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-(--duration-fast) ease-in-out" />
            </button>

            <button className="flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,transform,scale] duration-(--duration-fast) ease-out hover:bg-neutral-800 active:scale-[0.96]">
              <Mic className="h-4 w-4" />
            </button>

{value.trim() && (
  <button
    type="button"
    className="
      flex h-9 w-9 shrink-0 items-center justify-center
      rounded-lg
      bg-white
      text-neutral-900

      animate-in
      fade-in-80
      zoom-in-75
      slide-in-from-right-3

      duration-300
      ease-out
      fill-mode-forwards

      transition-colors
      hover:bg-neutral-200
      active:scale-90
    "
  >
    <ArrowUp className="h-4 w-4" />
  </button>
)}
          </div>
        </div>
      </div>
    </div>
  );
}