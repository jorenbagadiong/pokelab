import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep three.js out of jsdom; expose the props the hero passes to the scene.
vi.mock("@/components/three/hero-scene", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MockScene({
      actionSignal,
      animate,
      onReady,
      labels = [],
    }: {
      actionSignal: number;
      animate: boolean;
      onReady?: () => void;
      labels?: { id: number; href: string; ariaLabel: string }[];
    }) {
      useEffect(() => onReady?.(), [onReady]);
      return (
        <div data-testid="hero-scene" data-action={actionSignal} data-animate={String(animate)}>
          {/* The real scene projects these labels under each 3D model. */}
          {labels.map((label) => (
            <a key={label.id} href={label.href} aria-label={label.ariaLabel} data-testid="scene-label" />
          ))}
        </div>
      );
    },
  };
});

// The app router is not mounted in unit tests.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const webgl = vi.hoisted(() => ({ accelerated: true }));
vi.mock("@/lib/webgl", () => ({ isHardwareAcceleratedWebGL: () => webgl.accelerated }));

const pikachu = {
  id: 25,
  slug: "pikachu",
  name: "Pikachu",
  types: ["electric"],
  artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
};
const charizard = {
  id: 6,
  slug: "charizard",
  name: "Charizard",
  types: ["fire", "flying"],
  artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
};
const gengar = {
  id: 94,
  slug: "gengar",
  name: "Gengar",
  types: ["ghost", "poison"],
  artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
};

async function renderHero(reducedMotion = false) {
  vi.resetModules();
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduced-motion") ? reducedMotion : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  const { HeroShowcase } = await import("./hero-showcase");
  return render(<HeroShowcase pokemon={pikachu} companions={[charizard, gengar]} />);
}

beforeEach(() => {
  webgl.accelerated = true;
});

describe("HeroShowcase", () => {
  it("falls back to the official artwork and a row of name links without hardware WebGL", async () => {
    webgl.accelerated = false;
    await renderHero();
    expect(screen.getByRole("img", { name: "Pikachu official artwork" })).toBeInTheDocument();
    expect(screen.queryByTestId("hero-scene")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#0094 Gengar" })).toHaveAttribute("href", "/pokemon/gengar");
  });

  it("passes one label per Pokémon to the scene, replacing the static row", async () => {
    await renderHero();
    const labels = await screen.findAllByTestId("scene-label");
    expect(labels.map((l) => l.getAttribute("aria-label"))).toEqual(["#0006 Charizard", "#0094 Gengar", "#0025 Pikachu"]);
    // The static fallback row is not rendered alongside the projected labels.
    expect(screen.getAllByRole("link", { name: "#0025 Pikachu" })).toHaveLength(1);
  });

  it("links to every Pokémon in the scene", async () => {
    await renderHero();
    expect(screen.getByRole("link", { name: /#0094\s+Gengar/ })).toHaveAttribute("href", "/pokemon/gengar");
    expect(screen.getByRole("link", { name: /#0025\s+Pikachu/ })).toHaveAttribute("href", "/pokemon/pikachu");
    expect(screen.getByRole("link", { name: /#0006\s+Charizard/ })).toHaveAttribute("href", "/pokemon/charizard");
  });

  it("shows only the 3D scene when supported, never the 2D artwork", async () => {
    await renderHero();
    expect(await screen.findByTestId("hero-scene")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Pikachu official artwork" })).not.toBeInTheDocument();
    expect(await screen.findByText(/Fan-made 3D models/)).toBeInTheDocument();
  });

  it("describes the interaction for assistive technology", async () => {
    await renderHero();
    expect(
      await screen.findByRole("button", {
        name: "Fan-made 3D Pikachu, Charizard, and Gengar built in code. Press to make Pikachu jump, Charizard breathe fire, and Gengar throw a Shadow Ball.",
      }),
    ).toBeInTheDocument();
  });

  it("triggers the action on click and on Enter/Space", async () => {
    const user = userEvent.setup();
    await renderHero();
    const stage = await screen.findByRole("button", { name: /Fan-made 3D Pikachu, Charizard, and Gengar/ });
    await user.click(stage);
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-action", "1");
    stage.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-action", "3");
  });

  it("shows a static, non-interactive scene with reduced motion", async () => {
    await renderHero(true);
    await act(async () => {});
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-animate", "false");
    expect(screen.queryByRole("button", { name: /Fan-made 3D/ })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fan-made 3D Pikachu, Charizard, and Gengar built in code." })).toBeInTheDocument();
  });
});
