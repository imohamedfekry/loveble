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
        "mt-5 mb-1.5 px-5 text-[11px] font-medium uppercase tracking-wider text-neutral-500 whitespace-nowrap overflow-hidden transition-[max-height,opacity] duration-(--duration-quick) ease-in-out motion-reduce:transition-none",
        open ? "opacity-100 delay-(--duration-micro)" : "opacity-0 pointer-events-none"
      )}
    >
      {children}
    </div>
  );
}
