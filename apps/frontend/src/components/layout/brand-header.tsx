import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

export const brandFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

type BrandHeaderProps = {
  className?: string;
};

export function BrandHeader({ className }: BrandHeaderProps) {
  return (
    <div
      className={cn(
        "group/logo flex w-full items-center justify-center gap-2.5",
        className,
      )}
    >
      <img
        src="/logo.svg"
        alt="Squadra"
        className="size-9 transition-transform duration-300 group-hover/logo:scale-105 md:size-11"
      />
      <h1
        className={cn(
          "text-4xl font-semibold tracking-tight md:text-5xl",
          brandFont.className,
        )}
      >
        Squadra
      </h1>
    </div>
  );
}
