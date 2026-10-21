import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep three.js out of jsdom; expose the props the hero passes to the scene.
vi.mock("@/components/three/pikachu-scene", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MockScene({ hopSignal, animate, onReady }: { hopSignal: number; animate: boolean; onReady?: () => void }) {
      useEffect(() => onReady?.(), [onReady]);
      return <div data-testid="pikachu-scene" data-hop={hopSignal} data-animate={String(animate)} />;
    },
  };
});

const webgl = vi.hoisted(() => ({ accelerated: true }));
vi.mock("@/lib/webgl", () => ({ isHardwareAcceleratedWebGL: () => webgl.accelerated }));

const pikachu = {
  id: 25,
  slug: "pikachu",
  name: "Pikachu",
  types: ["electric"],
  artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
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
  const { HeroPikachu } = await import("./hero-pikachu");
  return render(<HeroPikachu pokemon={pikachu} />);
}

beforeEach(() => {
  webgl.accelerated = true;
});

describe("HeroPikachu", () => {
  it("falls back to the official artwork without hardware WebGL", async () => {
    webgl.accelerated = false;
    await renderHero();
    expect(screen.getByRole("img", { name: "Pikachu official artwork" })).toBeInTheDocument();
    expect(screen.queryByTestId("pikachu-scene")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#0025\s+Pikachu/ })).toHaveAttribute("href", "/pokemon/pikachu");
  });

  it("shows only the 3D model when supported, never the 2D artwork", async () => {
    await renderHero();
    expect(await screen.findByTestId("pikachu-scene")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Pikachu official artwork" })).not.toBeInTheDocument();
  });

  it("shows the interactive 3D model, labelled as fan-made, when supported", async () => {
    await renderHero();
    const stage = await screen.findByRole("button", { name: /Fan-made 3D Pikachu built in code\. Press to make it jump\./ });
    expect(stage).toBeInTheDocument();
    expect(await screen.findByText(/Fan-made 3D model/)).toBeInTheDocument();
  });

  it("hops on click and on Enter/Space", async () => {
    const user = userEvent.setup();
    await renderHero();
    const stage = await screen.findByRole("button", { name: /Fan-made 3D Pikachu/ });
    await user.click(stage);
    expect(screen.getByTestId("pikachu-scene")).toHaveAttribute("data-hop", "1");
    stage.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.getByTestId("pikachu-scene")).toHaveAttribute("data-hop", "3");
  });

  it("shows a static, non-interactive model with reduced motion", async () => {
    await renderHero(true);
    await act(async () => {});
    expect(screen.getByTestId("pikachu-scene")).toHaveAttribute("data-animate", "false");
    expect(screen.queryByRole("button", { name: /Fan-made 3D Pikachu/ })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fan-made 3D Pikachu built in code." })).toBeInTheDocument();
  });
});
