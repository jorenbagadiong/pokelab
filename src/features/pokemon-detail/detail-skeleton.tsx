import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <PageContainer className="pt-8 sm:pt-12">
      <div role="status" aria-label="Loading Pokémon">
        <Skeleton className="mb-8 h-4 w-40" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="mx-auto aspect-square w-full max-w-md">
            <Skeleton className="size-full rounded-full opacity-60" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-72 max-w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}
