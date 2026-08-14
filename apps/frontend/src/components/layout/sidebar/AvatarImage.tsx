import { cn } from "@/lib/utils";

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
        className={`flex shrink-0 items-center justify-center bg-primary/20 font-semibold text-brand-accent-2 ${className}`}
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn(className)} style={{ ...style }} />;

}
