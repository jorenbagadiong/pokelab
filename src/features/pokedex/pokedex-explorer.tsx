"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Heart, RotateCcw, Search, X } from "lucide-react";
import { POKEMON_TYPES, type PokemonType } from "@/constants/types";
import type { PokemonSummary } from "@/types/pokemon";
import { useFavorites } from "@/hooks/use-favorites";
import { usePressFeedback } from "@/hooks/use-press-feedback";
import { useReveal } from "@/hooks/use-reveal";
import { titleCase } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button, IconButton } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/states";
import { PokemonCard } from "@/components/pokemon/pokemon-card";
import { Pagination } from "./pagination";
import { DEFAULT_QUERY, parseQuery, runQuery, serializeQuery, SORT_OPTIONS, type PokedexQuery, type SortOption } from "./query";

const SEARCH_DEBOUNCE_MS = 250;

function writeUrl(query: PokedexQuery, mode: "push" | "replace") {
  const search = serializeQuery(query);
  const url = `${window.location.pathname}${search ? `?${search}` : ""}`;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function PokedexExplorer({ index }: { index: PokemonSummary[] }) {
  const searchParams = useSearchParams();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const { ids: favoriteIds, ready: favoritesReady } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // The text field updates immediately; the URL (and results) follow after a debounce.
  const [input, setInput] = useState(query.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const onPress = usePressFeedback();
  const searchId = useId();
  const typeId = useId();
  const sortId = useId();

  const update = useCallback(
    (patch: Partial<PokedexQuery>, mode: "push" | "replace" = "replace") => {
      // Any filter change returns to the first page unless a page is given explicitly.
      writeUrl({ ...parseQuery(new URLSearchParams(window.location.search)), page: 1, ...patch }, mode);
    },
    [],
  );

  // Keep the text field in sync when the URL changes from elsewhere (back/forward,
  // links such as the home page search, or a route restored by Activity).
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    setInput(query.q);
  }

  // A pending debounced write must not overwrite a history entry the user navigated to.
  useEffect(() => {
    const cancelPending = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    window.addEventListener("popstate", cancelPending);
    return () => {
      window.removeEventListener("popstate", cancelPending);
      cancelPending();
    };
  }, []);

  const onSearchChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update({ q: value }), SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInput("");
    update({ q: "" });
  };

  const reset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInput("");
    writeUrl(DEFAULT_QUERY, "replace");
  };

  const goToPage = (page: number) => {
    update({ page }, "push");
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  // Favorites-only results depend on browser storage; show all until it is read.
  const effectiveQuery = useMemo(
    () => (favoritesReady ? query : { ...query, favoritesOnly: false }),
    [favoritesReady, query],
  );
  const result = useMemo(() => runQuery(index, effectiveQuery, favoriteSet), [index, effectiveQuery, favoriteSet]);
  const isFiltered = query.q.trim() !== "" || query.type !== null || query.favoritesOnly || query.sort !== DEFAULT_QUERY.sort;
  const resultKey = serializeQuery({ ...effectiveQuery, page: result.page });
  const gridRef = useReveal<HTMLUListElement>("[data-card]", [resultKey], { step: 30, distance: 12 });

  return (
    <div>
      <div
        role="search"
        className="z-30 mb-6 rounded-xl border border-border bg-bg/85 p-3 backdrop-blur-xl sm:p-4 md:sticky md:top-[var(--header-height)]"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-[minmax(0,1fr)_12rem_13rem_auto]">
          <div className="col-span-2 md:col-span-1">
            <label htmlFor={searchId} className="sr-only">
              Search by name or Pokédex number
            </label>
            <TextInput
              id={searchId}
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search by name or number, e.g. “eevee” or “#133”"
              value={input}
              maxLength={60}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={<Search className="size-4" />}
              trailing={
                input ? (
                  <IconButton label="Clear search" size="sm" className="size-8 border-transparent bg-transparent" onClick={clearSearch}>
                    <X className="size-4" aria-hidden="true" />
                  </IconButton>
                ) : null
              }
            />
          </div>
          <div>
            <label htmlFor={typeId} className="sr-only">
              Filter by type
            </label>
            <Select
              id={typeId}
              value={query.type ?? ""}
              onChange={(e) => update({ type: (e.target.value || null) as PokemonType | null })}
            >
              <option value="">All types</option>
              {POKEMON_TYPES.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor={sortId} className="sr-only">
              Sort order
            </label>
            <Select id={sortId} value={query.sort} onChange={(e) => update({ sort: e.target.value as SortOption })}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex gap-2 md:col-span-1">
            <button
              type="button"
              aria-pressed={query.favoritesOnly}
              onPointerDown={onPress}
              onClick={() => update({ favoritesOnly: !query.favoritesOnly })}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 md:flex-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                query.favoritesOnly
                  ? "border-favorite/40 bg-favorite/15 text-favorite"
                  : "border-border-strong bg-surface text-muted hover:text-text",
              )}
            >
              <Heart className={cn("size-4", query.favoritesOnly && "fill-current")} aria-hidden="true" />
              Favorites
            </button>
            <Button variant="ghost" onPointerDown={onPress} onClick={reset} disabled={!isFiltered && !input} className="h-11 px-3.5">
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-48">
        <p className="mb-4 text-sm text-muted" aria-live="polite" aria-atomic="true">
          {result.total === 0
            ? "No Pokémon match your filters."
            : `Showing ${result.start}–${result.end} of ${result.total.toLocaleString("en")} Pokémon`}
        </p>

        {result.total === 0 ? (
          <EmptyState
            title={query.favoritesOnly && favoriteSet.size === 0 ? "No favorites yet" : "No Pokémon found"}
            description={
              query.favoritesOnly && favoriteSet.size === 0
                ? "Tap the heart on any Pokémon to save it here."
                : "Try a different name or number, or clear the filters."
            }
            action={
              <Button variant="secondary" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset filters
              </Button>
            }
          />
        ) : (
          <ul ref={gridRef} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {result.items.map((pokemon, i) => (
              <li key={pokemon.id}>
                <PokemonCard pokemon={pokemon} preload={i < 6} />
              </li>
            ))}
          </ul>
        )}

        <Pagination page={result.page} pageCount={result.pageCount} query={effectiveQuery} onPageChange={goToPage} />
      </div>
    </div>
  );
}
