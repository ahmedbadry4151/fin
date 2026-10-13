import { KpiSkeleton, ChartSkeleton, Skeleton } from "@/components/ui/states";
export default function Loading() {
  return (
    <div className="space-y-5">
      <div><Skeleton className="h-3 w-32" /><Skeleton className="mt-3 h-8 w-72" /></div>
      <KpiSkeleton />
      <ChartSkeleton />
    </div>
  );
}
