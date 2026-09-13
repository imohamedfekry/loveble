import { cn } from "@/lib/utils";
import { BrandHeader } from "./brand-header";

type BrandPageShellProps = {
  children: React.ReactNode;
  showBrand?: boolean;
  className?: string;
  contentClassName?: string;
  variant?: "viewport" | "fill";
};

export function BrandPageShell({
  children,
  showBrand = true,
  className,
  contentClassName,
  variant = "viewport",
}: BrandPageShellProps) {
  return (
    <div
      className={cn(
        "page-gradient flex w-full flex-col items-center justify-center overflow-y-auto p-6",
        variant === "fill" ? "h-full min-h-0" : "min-h-screen",
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
