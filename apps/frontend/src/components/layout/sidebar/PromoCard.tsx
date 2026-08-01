import type { IconType } from "./types";

export function PromoCard({
  open,
  icon: Icon,
  title,
  subtitle,
}: {
  open: boolean;
  icon: IconType;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-neutral-800 bg-[#141419] transition-[max-height,opacity,padding,margin] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "max-h-24 opacity-100 px-2 py-2 delay-150" : "max-h-0 opacity-0 px-2 py-0 border-transparent"}`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-neutral-200 whitespace-nowrap">{title}</div>
          <div className="text-[11px] text-neutral-500 whitespace-nowrap">{subtitle}</div>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
      </div>
    </div>
  );
}