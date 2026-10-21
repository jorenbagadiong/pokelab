import Form from "next/form";
import { ArrowRight, Search } from "lucide-react";

/** Submits to the Pokédex with `?q=`. Works without JavaScript; with it, navigates client-side. */
export function HeroSearch() {
  return (
    <Form action="/pokemon" role="search" className="relative w-full max-w-xl">
      <label htmlFor="hero-search" className="sr-only">
        Search Pokémon by name or number
      </label>
      <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <input
        id="hero-search"
        name="q"
        type="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={60}
        placeholder="Search “pikachu”, “gengar” or “#448”"
        className="h-14 w-full rounded-full border border-border-strong bg-surface-strong pl-14 pr-36 text-base text-text shadow-md placeholder:text-subtle transition-[border-color,box-shadow] duration-200 hover:border-accent/60 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 inline-flex h-11 -translate-y-1/2 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors duration-200 hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Search
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </Form>
  );
}
