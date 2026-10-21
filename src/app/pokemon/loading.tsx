import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplorerSkeleton } from "@/features/pokedex/explorer-skeleton";

export default function Loading() {
  return (
    <PageContainer className="pt-10 sm:pt-14">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <ExplorerSkeleton />
    </PageContainer>
  );
}
