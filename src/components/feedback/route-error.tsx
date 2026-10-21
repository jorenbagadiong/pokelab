"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { ErrorState } from "./states";

/** Shared body for `error.tsx` route boundaries. */
export function RouteError({ error, retry, title }: { error: unknown; retry: () => void; title: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  return (
    <PageContainer className="py-16">
      <ErrorState
        title={title}
        description={
          <>
            <p>PokéAPI may be temporarily unreachable, or your connection dropped. Please try again.</p>
            {digest && <p className="mt-2 font-mono text-xs text-subtle">Reference: {digest}</p>}
          </>
        }
        action={
          <>
            <Button onClick={() => retry()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
    </PageContainer>
  );
}
