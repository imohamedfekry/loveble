import { cn } from "@/lib/utils";
import { CollapseLabel } from "./CollapseLabel";
import { HugeiconsIcon } from "@hugeicons/react";

export function NavItem({
  icon,
  label,
  shortcut,
  active,
  open,
}: {
  icon: any;
  label: string;
  shortcut?: string;
  active?: boolean;
  open: boolean;
}) {
  const Icon = icon;
  const isHugeIcon = Array.isArray(Icon);

  return (
    <button
      title={label}
      onClick={(e) => {
        if (!open) e.stopPropagation();
      }}
className={cn(
  "relative flex h-8 w-full items-center rounded-md px-2 text-sm text-white",
  "transition-colors duration-(--duration-quick) ease-(--ease-smooth-out)",

  // Normal hover
  "hover:bg-neutral-800/90",

  // Indicator
  "after:absolute after:left-0 after:top-1/2",
  "after:h-[55%] after:w-[2px]",
  "after:-translate-y-1/2",
  "after:rounded-[10px]",
  "after:bg-[#a1a1a1]",
  "after:content-['']",
  "after:opacity-0",
  "hover:after:opacity-100",

  // Active
  active && "bg-neutral-700/90 after:opacity-100",

  // Active + Hover
  active && "hover:bg-neutral-600/90",

  !open && "cursor-pointer",
)}
    >
      {isHugeIcon ? (
        <HugeiconsIcon
          icon={Icon}
          className="h-4.5 w-4.5 shrink-0"
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}

      <CollapseLabel
        open={open}
        className="ml-2.5"
      >
        {label}
      </CollapseLabel>

      {shortcut && (
        <span
          className={cn(
            "ml-auto rounded bg-neutral-800 px-1.5 py-0.5",
            "text-[10px] whitespace-nowrap text-neutral-400",
            open
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          )}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}