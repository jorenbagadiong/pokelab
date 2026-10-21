import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/constants/app";
import { createLocalStore } from "@/lib/storage/local-store";
import { sampleIndex } from "@/test/fixtures";
import { parseFavorites, toggleId } from "./favorites-store";

const KEY = STORAGE_KEYS.favorites;

async function freshModules() {
  vi.resetModules();
  const store = await import("./favorites-store");
  const { FavoriteButton } = await import("@/components/pokemon/favorite-button");
  const { FavoritesView } = await import("./favorites-view");
  return { ...store, FavoriteButton, FavoritesView };
}

describe("favorites parsing", () => {
  it("accepts arrays of positive integer ids and removes duplicates", () => {
    expect(parseFavorites("[1, 25, 25, 133]")).toEqual([1, 25, 133]);
    expect(parseFavorites('[1, "2", -3, 4.5, null, 6]')).toEqual([1, 6]);
  });

  it("rejects non-array data", () => {
    expect(parseFavorites('{"ids": [1]}')).toBeNull();
    expect(parseFavorites("42")).toBeNull();
  });

  it("toggles ids immutably", () => {
    const ids = [1, 2];
    expect(toggleId(ids, 3)).toEqual([1, 2, 3]);
    expect(toggleId(ids, 1)).toEqual([2]);
    expect(ids).toEqual([1, 2]);
  });
});

describe("favorites persistence", () => {
  it("persists to localStorage and survives a reload", async () => {
    const first = await freshModules();
    act(() => first.favoritesStore.set([25, 133]));
    expect(window.localStorage.getItem(KEY)).toBe("[25,133]");

    const reloaded = await freshModules(); // new module instance, same storage
    expect(reloaded.favoritesStore.get()).toEqual([25, 133]);
  });

  it("falls back to an empty list for corrupted storage", async () => {
    window.localStorage.setItem(KEY, "{not json");
    const { favoritesStore } = await freshModules();
    expect(favoritesStore.get()).toEqual([]);
  });

  it("returns the empty server snapshot so server and hydration output match", async () => {
    window.localStorage.setItem(KEY, "[1]");
    const { favoritesStore } = await freshModules();
    expect(favoritesStore.getServerSnapshot()).toEqual([]);
    expect(favoritesStore.get()).toEqual([1]);
  });

  it("keeps working in memory when storage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    const store = createLocalStore<number[]>({ key: "test", fallback: [], parse: JSON.parse, serialize: JSON.stringify });
    expect(store.get()).toEqual([]);
    store.set([7]);
    expect(store.get()).toEqual([7]);
    expect(spy).toHaveBeenCalled();
  });

  it("syncs with changes made in another tab", async () => {
    const { favoritesStore } = await freshModules();
    const listener = vi.fn();
    const unsubscribe = favoritesStore.subscribe(listener);
    window.localStorage.setItem(KEY, "[4]");
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(listener).toHaveBeenCalled();
    expect(favoritesStore.get()).toEqual([4]);
    unsubscribe();
  });
});

describe("favorite indicators", () => {
  it("toggles, persists and stays in sync across components", async () => {
    const { FavoriteButton } = await freshModules();
    const user = userEvent.setup();
    render(
      <>
        <FavoriteButton id={25} name="Pikachu" />
        <FavoriteButton id={25} name="Pikachu" variant="pill" />
      </>,
    );

    const [icon, pill] = screen.getAllByRole("button", { name: "Add Pikachu to favorites" });
    expect(icon).toHaveAttribute("aria-pressed", "false");

    await user.click(icon);
    const pressed = screen.getAllByRole("button", { name: "Remove Pikachu from favorites" });
    expect(pressed).toHaveLength(2);
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(pill).toHaveTextContent("Saved to favorites");
    expect(window.localStorage.getItem(KEY)).toBe("[25]");

    await user.click(pill);
    expect(screen.getAllByRole("button", { name: "Add Pikachu to favorites" })).toHaveLength(2);
    expect(window.localStorage.getItem(KEY)).toBe("[]");
  });
});

describe("FavoritesView", () => {
  it("shows an empty state when nothing is saved", async () => {
    const { FavoritesView } = await freshModules();
    render(<FavoritesView index={sampleIndex} />);
    expect(screen.getByRole("heading", { name: "No favorites yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the Pokédex" })).toHaveAttribute("href", "/pokemon");
  });

  it("lists saved Pokémon newest first and skips unknown ids", async () => {
    window.localStorage.setItem(KEY, "[1, 9999, 133]");
    const { FavoritesView } = await freshModules();
    render(<FavoritesView index={sampleIndex} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Eevee", "Bulbasaur"]);
    expect(screen.getByText("2 saved Pokémon")).toBeInTheDocument();
  });

  it("clears all favorites after confirmation", async () => {
    window.localStorage.setItem(KEY, "[25]");
    const { FavoritesView } = await freshModules();
    const user = userEvent.setup();
    render(<FavoritesView index={sampleIndex} />);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.click(screen.getByRole("button", { name: "Remove all" }));
    expect(screen.getByRole("heading", { name: "No favorites yet" })).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("[]");
  });
});
