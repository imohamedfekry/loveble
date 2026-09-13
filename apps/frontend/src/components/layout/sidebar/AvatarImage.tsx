import { cn } from "@loveble/utils";

export function AvatarImage({
  src,
  alt,
  className,
  style,
}: {
  src: string | null | undefined;
  alt: string;
  className: string;
  style?: React.CSSProperties;
}) {
  if (!src) {
    return (
      <div
        /* Brand kit: Deep Onyx on Vibrant Magenta (6.86:1, AA) — no off-palette hex. */
        className={`flex shrink-0 items-center justify-center border border-primary/60 bg-primary font-semibold text-primary-foreground ${className}`}
      >
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- remote + size via className
  return <img src={src} alt={alt} className={cn(className)} style={{ ...style }} />;

}
