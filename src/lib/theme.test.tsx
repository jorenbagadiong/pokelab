import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/constants/app";
import { parseTheme, THEME_BOOTSTRAP_SCRIPT } from "./theme";

const root = document.documentElement;

beforeEach(() => {
  delete root.dataset.theme;
  delete root.dataset.motion;
  root.style.colorScheme = "";
});

describe("theme", () => {
  it("accepts only known themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("sepia")).toBeNull();
  });

  it("bootstrap script applies the stored theme before paint and defaults to dark", () => {
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(root.dataset.theme).toBe("dark");

    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
  });

  it("bootstrap script ignores invalid stored values and only enables motion when allowed", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "neon");
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(root.dataset.theme).toBe("dark");
    // The test environment reports prefers-reduced-motion: reduce.
    expect(root.dataset.motion).toBeUndefined();
  });

  it("toggle switches theme, updates the document and persists the choice", async () => {
    vi.resetModules();
    const { ThemeToggle } = await import("@/components/layout/theme-toggle");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(root.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("light");

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(root.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("dark");
  });
});
