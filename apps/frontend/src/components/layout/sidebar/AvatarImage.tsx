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
        className={`flex shrink-0 items-center justify-center border border-[#a22665] bg-[#b30d61] font-semibold text-white ${className}`}
      >
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- remote + size via className
  return <img src={src} alt={alt} className={cn(className)} style={{ ...style }} />;

}
