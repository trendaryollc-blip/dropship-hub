import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeSwitcher from "./ThemeSwitcher";

const themeSpies = vi.hoisted(() => ({
  setTheme: vi.fn(),
}));

vi.mock("./ThemeProvider", () => ({
  useTheme: () => ({
    theme: "crimson-noir",
    setTheme: themeSpies.setTheme,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText("Change theme")).toBeDefined();
  });

  it("opens dropdown on click", () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText("Change theme"));
    expect(screen.getByText("Themes")).toBeDefined();
  });

  it("selects a theme and closes the dropdown", () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText("Change theme"));
    fireEvent.click(screen.getByText("Ember Glow"));
    expect(themeSpies.setTheme).toHaveBeenCalledWith("ember-glow");
    expect(screen.queryByText("Ember Glow")).not.toBeInTheDocument();
  });
});
