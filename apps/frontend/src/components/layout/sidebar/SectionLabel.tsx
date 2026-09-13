import { cn } from "@loveble/utils";

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
        "overflow-hidden px-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase",
        "transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "mt-5 mb-1.5 opacity-100" : "pointer-events-none mt-5 mb-1.5 opacity-0"
      )}
    >
      {children}
    </div>
  );
}