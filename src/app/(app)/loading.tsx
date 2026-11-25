import { SkeletonTransition } from "@/components/motion/skeleton-transition";
import { KpiSkeleton, ChartSkeleton, Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <SkeletonTransition className="space-y-5">
      <div><Skeleton className="h-3 w-32" /><Skeleton className="mt-3 h-8 w-72" /></div>
      <KpiSkeleton />
      <ChartSkeleton />
    </SkeletonTransition>
  );
}
