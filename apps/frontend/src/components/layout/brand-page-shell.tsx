import { cn } from "@/lib/utils";
import { BrandHeader } from "./brand-header";

type BrandPageShellProps = {
  children: React.ReactNode;
  showBrand?: boolean;
  className?: string;
  contentClassName?: string;
};

export function BrandPageShell({
  children,
  showBrand = true,
  className,
  contentClassName,
}: BrandPageShellProps) {
  return (
    <div
      className={cn(
        "page-gradient flex min-h-screen flex-col items-center justify-center p-6",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-sm flex-col items-center gap-6",
          contentClassName,
        )}
      >
        {showBrand && <BrandHeader />}
        {children}
      </div>
    </div>
  );
}
