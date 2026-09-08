import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeSwitcher from "./ThemeSwitcher";

vi.mock("./ThemeProvider", () => ({
  useTheme: () => ({
    theme: "crimson-noir",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/lib/themes", () => ({
  themes: {
    "crimson-noir": { name: "crimson-noir", label: "Crimson Noir", swatch: ["#e11d48", "#000", "#fff"] },
    "ember-glow": { name: "ember-glow", label: "Ember Glow", swatch: ["#f97316", "#1a0a00", "#fff"] },
  },
  themeOrder: ["crimson-noir", "ember-glow"],
}));

vi.mock("lucide-react", () => ({
  Palette: () => <div />,
  Check: () => <div />,
}));

describe("ThemeSwitcher", () => {
  it("renders trigger button", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText("Change theme")).toBeDefined();
  });

  it("opens dropdown on click", () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText("Change theme"));
    expect(screen.getByText("Themes")).toBeDefined();
  });

  it("selects theme", () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText("Change theme"));
    fireEvent.click(screen.getByText("Ember Glow"));
  });
});
