import { Skeleton } from "@/components/ui/skeleton";

export const TreeItemWrapperSkeleton = ({
  level = 0,
}: {
  level?: number;
}) => {
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md px-2"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <Skeleton className="h-4 w-32 bg-accent" />
    </div>
  );
};