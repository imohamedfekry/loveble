import { CollapseLabel } from "./CollapseLabel";
import type { IconType } from "./types";

export function NavItem({
  icon: Icon,
  label,
  shortcut,
  active,
  open,
}: {
  icon: IconType;
  label: string;
  shortcut?: string;
  active?: boolean;
  open: boolean;
}) {
  return (
    <button
      title={label}
      className={`flex h-8 w-full items-center rounded-md px-2 text-white text-sm transition-colors ${active
        ? "bg-neutral-800"
        : "hover:bg-neutral-800/60"
        }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <CollapseLabel open={open} className="ml-2.5">
        {label}
      </CollapseLabel>
      {shortcut && (
        <span
          className={`ml-auto rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-neutral-400 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"
            }`}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}