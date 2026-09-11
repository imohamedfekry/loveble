import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted dark:bg-white/[0.09]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
