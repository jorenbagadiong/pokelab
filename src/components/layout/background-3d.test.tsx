import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/three/nexus-background", () => ({
  default: ({ theme, animate }: { theme: string; animate: boolean }) => (
    <div data-testid="nexus-scene" data-theme-prop={theme} data-animate={String(animate)} />
  ),
}));

const webgl = vi.hoisted(() => ({ available: true }));
vi.mock("@/lib/webgl", () => ({ isHardwareAcceleratedWebGL: () => webgl.available }));

async function renderBackground() {
  vi.resetModules();
  const { Background3D } = await import("./background-3d");
  const utils = render(<Background3D />);
  // Let the idle callback (fallback timer in jsdom) fire.
  await act(async () => {
    vi.advanceTimersByTime(3000);
  });
  return utils;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  webgl.available = true;
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
});

describe("Background3D", () => {
  it("loads the scene after idle, following the current theme", async () => {
    window.localStorage.setItem("nexus:theme", "light");
    await renderBackground();
    const scene = await screen.findByTestId("nexus-scene");
    expect(scene).toHaveAttribute("data-theme-prop", "light");
    expect(screen.getByTestId("background-3d")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a static frame when the user prefers reduced motion", async () => {
    await renderBackground();
    expect(await screen.findByTestId("nexus-scene")).toHaveAttribute("data-animate", "false");
  });

  it("falls back to the CSS backdrop without hardware-accelerated WebGL", async () => {
    webgl.available = false;
    await renderBackground();
    expect(screen.queryByTestId("background-3d")).not.toBeInTheDocument();
  });

  it("respects Save-Data", async () => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
    await renderBackground();
    expect(screen.queryByTestId("background-3d")).not.toBeInTheDocument();
  });
});
