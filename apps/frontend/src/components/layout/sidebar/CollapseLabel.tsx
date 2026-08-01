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
      className={`grid overflow-hidden transition-[grid-template-columns,opacity] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "[grid-template-columns:1fr] opacity-100" : "[grid-template-columns:0fr] opacity-0"} ${className}`}
    >
      <span className="min-w-0 whitespace-nowrap">{children}</span>
    </span>
  );
}