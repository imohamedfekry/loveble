import { cn } from "@/lib/utils";

export function SectionLabel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-5 mb-1.5 overflow-hidden px-4",
        "text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        "whitespace-nowrap",
        open
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      {children}
    </div>
  );
}