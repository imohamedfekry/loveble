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
        alt="loveble"
        className="size-9 rounded-xl outline outline-1 -outline-offset-1 outline-black/10 opacity-90 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none group-hover/logo:scale-105 group-hover/logo:opacity-100 md:size-11"
      />
      <h1
        className={cn(
          "text-4xl font-semibold tracking-tight md:text-5xl",
          brandFont.className,
        )}
      >
        loveble
      </h1>
    </div>
  );
}
