import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedText } from "./animated-text";

describe("AnimatedText", () => {
  it("keeps the full text as the accessible name", () => {
    render(<AnimatedText as="h1" text="Mr. Mime" trigger="mount" />);
    expect(screen.getByRole("heading", { level: 1, name: "Mr. Mime" })).toBeInTheDocument();
  });

  it("splits into per-character units hidden from assistive technology", () => {
    const { container } = render(<AnimatedText as="h2" text="Hi you" />);
    const units = container.querySelectorAll("[data-unit]");
    expect([...units].map((u) => u.textContent)).toEqual(["H", "i", "y", "o", "u"]);
    expect(units[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("animates styled segments per word so the style stays on the moving element", () => {
    const { container } = render(
      <AnimatedText as="h1" text={["The ", { text: "every Pokémon", className: "gradient" }]} trigger="mount" />,
    );
    const styled = [...container.querySelectorAll("[data-unit].gradient")].map((u) => u.textContent);
    expect(styled).toEqual(["every", "Pokémon"]);
    expect(screen.getByRole("heading", { name: "The every Pokémon" })).toBeInTheDocument();
  });

  it("supports word splitting", () => {
    const { container } = render(<AnimatedText as="p" split="words" text="Search the Pokédex" />);
    expect([...container.querySelectorAll("[data-unit]")].map((u) => u.textContent)).toEqual(["Search", "the", "Pokédex"]);
  });

  it("pre-hides units only for mount animations, and reveals them (reduced motion in tests)", () => {
    const mount = render(<AnimatedText text="Go" trigger="mount" />);
    // With reduced motion the reveal completes immediately and removes the hidden state.
    mount.container.querySelectorAll("[data-unit]").forEach((u) => {
      expect(u).not.toHaveAttribute("data-reveal");
      expect((u as HTMLElement).style.opacity).toBe("");
    });
    const inView = render(<AnimatedText text="Go" trigger="inView" />);
    inView.container.querySelectorAll("[data-unit]").forEach((u) => expect(u).not.toHaveAttribute("data-reveal"));
  });
});
