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
        "mt-5 mb-1.5 overflow-hidden px-5",
        "text-[11px] font-medium uppercase tracking-wider text-neutral-500",
        "whitespace-nowrap",
        "transition-opacity duration-(--duration-fast) ease-(--ease-smooth-out)",
        open
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      {children}
    </div>
  );
}