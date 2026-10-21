"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function PokemonError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="We couldn’t load this Pokédex data" />;
}
