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
        "inline-block w-40 overflow-hidden whitespace-nowrap text-left",
        "transition-[opacity,transform] duration-(--duration-quick) ease-in-out will-change-[opacity,transform] motion-reduce:transition-none",
        open
          ? "translate-x-0 opacity-100 delay-(--duration-micro)"
          : "-translate-x-1 opacity-0 pointer-events-none",
        className
      )}
    >
      {children}
    </span>
  );
}
