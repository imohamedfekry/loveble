import { cn } from "@/lib/utils";
import type { IconType } from "./types";

export function PromoCard({
  open,
  icon: Icon,
  title,
  subtitle,
  className
}: {
  open: boolean;
  icon: IconType;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg transition-[max-height,opacity] duration-(--duration-fast) ease-(--ease-smooth-out)",
        open
          ? "max-h-24 border border-neutral-800 bg-[#141419] opacity-100"
          : "max-h-0 opacity-0",
        className || ""
      )}
    >
      <div className="flex items-center justify-between p-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-neutral-200 whitespace-nowrap">{title}</div>
          <div className="text-[11px] text-neutral-500 whitespace-nowrap">{subtitle}</div>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
      </div>
    </div>
  );
}
