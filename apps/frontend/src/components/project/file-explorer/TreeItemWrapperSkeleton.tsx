import { Skeleton } from "@loveble/ui/skeleton";
import { getItemPadding } from "./constants";

export const TreeItemWrapperSkeleton = ({
  level = 0,
  isFile = true,
  width = "w-24",
}: {
  level?: number;
  isFile?: boolean;
  width?: string;
}) => {
  return (
    <div
      className="flex h-5.5 w-full items-center gap-1 pr-2"
      style={{ paddingLeft: getItemPadding(level, isFile) }}
    >
      {!isFile && <Skeleton className="size-4 shrink-0 rounded-sm opacity-60" />}
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <Skeleton className={`h-3 rounded-sm ${width}`} />
    </div>
  );
};