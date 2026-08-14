import { cn } from "@/lib/utils";

export function CollapseLabel({
  open,
  className = "",
  children,
}: {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block min-w-0 whitespace-nowrap text-left",
        open
          ? "opacity-100"
          : "pointer-events-none opacity-0",
        className
      )}
    >
      {children}
    </span>
  );
}