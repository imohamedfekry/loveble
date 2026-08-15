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
      type="button"
      title={label}
      onClick={(e) => {
        if (!open) e.stopPropagation();
      }}
      className={cn(
        "relative flex h-8 w-full items-center rounded-md px-2 text-sm text-sidebar-foreground",
        "transition-[background-color,color] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring/70",

        // Indicator — fixed geometry (2px × 55%), animated via scale + opacity only (no layout)
        "after:pointer-events-none after:absolute after:left-0 after:top-1/2",
        "after:h-[55%] after:w-[2px] after:-translate-y-1/2",
        "after:origin-center after:rounded-full after:bg-muted-foreground after:content-['']",
        "after:scale-y-40 after:opacity-0",
        "after:transition-[opacity,scale,background-color] after:duration-(--duration-quick) after:ease-(--ease-smooth-out) motion-reduce:after:transition-none",

        // DEFAULT → quiet. HOVER (non-active) → subtle tint + soft indicator preview
        !active &&
          "hover:bg-sidebar-accent/70 hover:after:scale-y-60 hover:after:opacity-45",

        // ACTIVE → persistent tint + full indicator (stronger color/size/opacity than hover)
        active &&
          "bg-sidebar-accent after:bg-sidebar-foreground after:scale-y-100 after:opacity-100",

        // ACTIVE + HOVER → keep active base, never weaken it
        active &&
          "hover:bg-sidebar-accent hover:after:bg-sidebar-foreground hover:after:scale-y-100 hover:after:opacity-100",

        !open && "cursor-pointer"
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
            "ml-auto rounded bg-sidebar-accent px-1.5 py-0.5",
            "text-[10px] whitespace-nowrap text-muted-foreground",
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