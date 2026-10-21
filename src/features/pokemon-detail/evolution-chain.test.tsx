import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseEvolutionChain } from "@/lib/api/schemas";
import { toEvolutionTree } from "@/lib/api/transform";
import { charmanderChainResponse, eeveeChainResponse, taurosChainResponse } from "@/test/fixtures";
import { EvolutionChain } from "./evolution-chain";

const tree = (response: unknown) => toEvolutionTree(parseEvolutionChain(response));

describe("EvolutionChain", () => {
  it("renders a branching chain with links and conditions", () => {
    render(<EvolutionChain chain={tree(eeveeChainResponse)} currentId={133} />);
    const chain = screen.getByRole("list", { name: "Evolution chain" });

    const links = within(chain).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/pokemon/eevee",
      "/pokemon/vaporeon",
      "/pokemon/jolteon",
      "/pokemon/espeon",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).not.toHaveAttribute("aria-current");

    expect(screen.getByText("Use Water Stone")).toBeInTheDocument();
    expect(screen.getByText("Use Thunder Stone")).toBeInTheDocument();
    expect(screen.getByText("Level up with high friendship (160+) during the day")).toBeInTheDocument();
  });

  it("renders a linear chain in order and marks the current stage", () => {
    render(<EvolutionChain chain={tree(charmanderChainResponse)} currentId={5} />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["#0004Charmander", "#0005Charmeleon", "#0006Charizard"]);
    expect(links[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Level 16")).toBeInTheDocument();
    expect(screen.getByText("Level 36")).toBeInTheDocument();
  });

  it("explains when a Pokémon does not evolve", () => {
    render(<EvolutionChain chain={tree(taurosChainResponse)} currentId={128} />);
    expect(screen.getByText("Tauros does not evolve into or from any other Pokémon.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Evolution chain" })).not.toBeInTheDocument();
  });

  it("handles a missing chain", () => {
    render(<EvolutionChain chain={null} currentId={1} />);
    expect(screen.getByText("Evolution data is not available for this Pokémon.")).toBeInTheDocument();
  });
});
