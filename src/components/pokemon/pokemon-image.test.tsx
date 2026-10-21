import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { officialArtworkUrl, pickImage } from "@/lib/utils/artwork";
import { PokemonCard } from "./pokemon-card";
import { PokemonImage } from "./pokemon-image";

describe("artwork helpers", () => {
  it("builds the official-artwork fallback URL", () => {
    expect(officialArtworkUrl(25)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    );
  });

  it("picks the first available image", () => {
    expect(pickImage(null, undefined, "", "b.png", "c.png")).toBe("b.png");
    expect(pickImage(null, undefined)).toBeNull();
  });
});

describe("PokemonImage", () => {
  it("renders the image when a URL is available", () => {
    render(<PokemonImage src={officialArtworkUrl(25)} alt="Pikachu" sizes="100px" />);
    expect(screen.getByRole("img", { name: "Pikachu" }).tagName).toBe("IMG");
  });

  it("shows a fallback when artwork is missing", () => {
    render(<PokemonImage src={null} alt="MissingNo" sizes="100px" />);
    expect(screen.getByRole("img", { name: "MissingNo (image unavailable)" })).toBeInTheDocument();
    expect(screen.getByText("Artwork unavailable")).toBeInTheDocument();
  });

  it("shows a fallback when the image fails to load", () => {
    render(<PokemonImage src="https://raw.githubusercontent.com/PokeAPI/sprites/master/missing.png" alt="Ghost" sizes="100px" />);
    fireEvent.error(screen.getByRole("img", { name: "Ghost" }));
    expect(screen.getByRole("img", { name: "Ghost (image unavailable)" })).toBeInTheDocument();
  });
});

describe("PokemonCard", () => {
  it("shows number, name, types, a detail link and a favorite toggle", () => {
    render(<PokemonCard pokemon={{ id: 6, slug: "charizard", name: "Charizard", types: ["fire", "flying"] }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pokemon/charizard");
    expect(screen.getByText("#0006")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Charizard" })).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Flying")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Charizard to favorites" })).toBeInTheDocument();
  });

  it("renders the missing-artwork fallback when PokéAPI has no artwork", () => {
    render(<PokemonCard pokemon={{ id: 9999, slug: "x", name: "Unknown", types: [] }} artwork={null} />);
    expect(screen.getByText("Artwork unavailable")).toBeInTheDocument();
    expect(screen.getByText("Type unknown")).toBeInTheDocument();
  });
});
