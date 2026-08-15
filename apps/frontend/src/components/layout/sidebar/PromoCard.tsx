import { cn } from "@/lib/utils";

export function PromoCard({
  open,
  icon: Icon,
  title,
  subtitle,
  className
}: {
  open: boolean;
  icon: any;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg transition-[max-height,opacity] duration-(--duration-quick) ease-(--ease-smooth-out)",
        open
          ? "max-h-24 border border-border bg-card opacity-100"
          : "max-h-0 opacity-0",
        className || ""
      )}
    >
      <div className="flex items-center justify-between p-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground whitespace-nowrap">{title}</div>
          <div className="text-[11px] text-muted-foreground whitespace-nowrap">{subtitle}</div>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
