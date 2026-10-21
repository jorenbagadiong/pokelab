import { SearchX } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/states";

export default function PokemonNotFound() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title="That Pokémon isn’t in the National Pokédex"
        description="Check the spelling, or search the Pokédex by name or number."
        action={
          <>
            <ButtonLink href="/pokemon">Search the Pokédex</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
    </PageContainer>
  );
}
