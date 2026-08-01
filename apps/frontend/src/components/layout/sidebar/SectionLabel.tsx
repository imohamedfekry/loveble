export function SectionLabel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden px-5 text-[11px] font-medium uppercase tracking-wider text-neutral-500 whitespace-nowrap transition-[max-height,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "mt-5 mb-1.5 max-h-6 opacity-100 delay-150" : "mt-0 mb-0 max-h-0 opacity-0"}`}>
      {children}
    </div>
  );
}