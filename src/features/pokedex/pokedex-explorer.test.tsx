import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonSummary } from "@/types/pokemon";

/*
 * Next.js keeps `useSearchParams` in sync with `history.pushState/replaceState`.
 * This mock reproduces that contract so the explorer can be tested end to end.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      () => window.location.search,
    );
    return new URLSearchParams(search);
  },
}));

const { PokedexExplorer } = await import("./pokedex-explorer");

// 60 generated entries: ids 1–60, every third one fire-type.
const index: PokemonSummary[] = Array.from({ length: 60 }, (_, i) => {
  const id = i + 1;
  return { id, slug: `mon-${id}`, name: `Mon ${String(id).padStart(2, "0")}`, types: id % 3 === 0 ? ["fire"] : ["water"] };
});
index[24] = { id: 25, slug: "pikachu", name: "Pikachu", types: ["electric"] };

const originalPush = window.history.pushState.bind(window.history);
const originalReplace = window.history.replaceState.bind(window.history);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  originalReplace(null, "", "/pokemon");
  window.history.pushState = (...args: Parameters<History["pushState"]>) => {
    originalPush(...args);
    notify();
  };
  window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    originalReplace(...args);
    notify();
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.history.pushState = originalPush;
  window.history.replaceState = originalReplace;
  vi.useRealTimers();
});

const cardNames = () => screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);
const status = () => screen.getByText(/^Showing|^No Pokémon match/);

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<PokedexExplorer index={index} />);
  return user;
}

describe("PokedexExplorer", () => {
  it("renders the first page of results", () => {
    setup();
    expect(cardNames()).toHaveLength(24);
    expect(cardNames()[0]).toBe("Mon 01");
    expect(status()).toHaveTextContent("Showing 1–24 of 60 Pokémon");
  });

  it("debounces search, updates the URL and filters results", async () => {
    const user = setup();
    await user.type(screen.getByRole("searchbox"), "pika");

    // Results do not change on every keystroke…
    expect(cardNames()).toHaveLength(24);
    // …only after the debounce interval.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(cardNames()).toEqual(["Pikachu"]);
    expect(window.location.search).toBe("?q=pika");
  });

  it("searches by Pokédex number", async () => {
    const user = setup();
    await user.type(screen.getByRole("searchbox"), "#7");
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(cardNames()).toEqual(["Mon 07"]);
  });

  it("shows an empty state and resets filters", async () => {
    const user = setup();
    await user.type(screen.getByRole("searchbox"), "zzz");
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("heading", { name: "No Pokémon found" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(cardNames()).toHaveLength(24);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(window.location.search).toBe("");
  });

  it("filters by type and sorts", async () => {
    const user = setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by type" }), "fire");
    expect(status()).toHaveTextContent("Showing 1–20 of 20 Pokémon");
    expect(cardNames()[0]).toBe("Mon 03");

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort order" }), "id-desc");
    expect(cardNames()[0]).toBe("Mon 60");
    expect(window.location.search).toBe("?type=fire&sort=id-desc");
  });

  it("paginates, and returns to page 1 when filters change", async () => {
    const user = setup();
    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    await user.click(within(pagination).getByRole("link", { name: "Page 3" }));
    expect(status()).toHaveTextContent("Showing 49–60 of 60 Pokémon");
    expect(cardNames()[0]).toBe("Mon 49");
    expect(window.location.search).toBe("?page=3");
    expect(within(pagination).getByRole("link", { name: "Page 3" })).toHaveAttribute("aria-current", "page");

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by type" }), "water");
    expect(status()).toHaveTextContent(/^Showing 1–24 of/);
    expect(window.location.search).toBe("?type=water");
  });

  it("supports previous/next links and disables them at the ends", async () => {
    const user = setup();
    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(pagination).getByText("Previous page").parentElement).toHaveAttribute("aria-disabled", "true");
    await user.click(within(pagination).getByRole("link", { name: "Next page" }));
    expect(cardNames()[0]).toBe("Pikachu"); // #25 opens page 2
    expect(window.location.search).toBe("?page=2");
  });

  it("restores state from the URL", () => {
    originalReplace(null, "", "/pokemon?type=fire&sort=name-desc&page=1");
    setup();
    expect(cardNames()[0]).toBe("Mon 60");
    expect(screen.getByRole("combobox", { name: "Filter by type" })).toHaveValue("fire");
  });

  it("clamps an out-of-range page from the URL", () => {
    originalReplace(null, "", "/pokemon?page=99");
    setup();
    expect(status()).toHaveTextContent("Showing 49–60 of 60 Pokémon");
  });

  it("filters to favorites", async () => {
    window.localStorage.setItem("nexus:favorites:v1", "[25, 3]");
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(cardNames()).toEqual(["Mon 03", "Pikachu"]);
    expect(window.location.search).toBe("?favorites=1");
  });
});
