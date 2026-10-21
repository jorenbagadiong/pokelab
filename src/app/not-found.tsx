import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/states";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        icon={<Compass className="size-6" aria-hidden="true" />}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={
          <>
            <ButtonLink href="/pokemon">Open the Pokédex</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
    </PageContainer>
  );
}
