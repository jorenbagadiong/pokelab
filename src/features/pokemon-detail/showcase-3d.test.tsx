import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHOWCASE_MODELS } from "@/constants/showcase";

// Keep three.js out of the test environment; the real viewer needs WebGL.
vi.mock("@/components/three/model-viewer", () => ({
  default: ({ label }: { label: string }) => <div role="img" aria-label={label} data-testid="model-viewer" />,
}));

const webgl = vi.hoisted(() => ({ available: false }));
vi.mock("@/lib/webgl", () => ({ isWebGLAvailable: () => webgl.available }));

const eeveeModel = SHOWCASE_MODELS[133]!;

async function renderShowcase(model = eeveeModel) {
  vi.resetModules();
  const { Showcase3D } = await import("./showcase-3d");
  return render(<Showcase3D pokemonName="Eevee" model={model} artwork={null} color="#A8A77A" />);
}

beforeEach(() => {
  webgl.available = false;
});

describe("Showcase3D fallbacks", () => {
  it("explains when no 3D model exists and shows 2D artwork instead", async () => {
    vi.resetModules();
    const { Showcase3D } = await import("./showcase-3d");
    render(<Showcase3D pokemonName="Pikachu" model={null} artwork={null} color="#F7D02C" />);
    expect(screen.getByText(/A 3D model is not available for Pikachu/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Pikachu official artwork \(2D\)/ })).toBeInTheDocument();
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
  });

  it("shows a clear message when WebGL is unavailable", async () => {
    await renderShowcase();
    expect(screen.getByText(/3D isn’t available: WebGL is disabled or unsupported/)).toBeInTheDocument();
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
  });

  it("labels the placeholder model as not being the Pokémon", async () => {
    await renderShowcase();
    expect(screen.getByText(/Placeholder model\./)).toBeInTheDocument();
    expect(screen.getByText(/It is not Eevee\./)).toBeInTheDocument();
  });

  it("loads the viewer only on request when WebGL is available", async () => {
    webgl.available = true;
    const user = userEvent.setup();
    await renderShowcase();
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load 3D viewer" }));
    const viewer = await screen.findByTestId("model-viewer");
    expect(viewer).toHaveAccessibleName("Interactive 3D placeholder model (Fox). This is not a model of Eevee.");
  });

  it("remembers the 'always load' preference", async () => {
    webgl.available = true;
    const user = userEvent.setup();
    const { unmount } = await renderShowcase();
    await user.click(screen.getByRole("button", { name: "Always load 3D" }));
    expect(await screen.findByTestId("model-viewer")).toBeInTheDocument();
    unmount();

    await renderShowcase();
    expect(await screen.findByTestId("model-viewer")).toBeInTheDocument();
  });
});
