import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock firebase auth
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

import GamificationPanel from "./GamificationPanel";

describe("GamificationPanel", () => {
  it("renders the progress label", () => {
    render(<GamificationPanel />);
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  it("renders level display", () => {
    render(<GamificationPanel />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });

  it("renders streak counter", () => {
    render(<GamificationPanel />);
    expect(screen.getByText(/day streak/)).toBeInTheDocument();
  });

  it("renders XP counter", () => {
    render(<GamificationPanel />);
    expect(screen.getByText("0 XP")).toBeInTheDocument();
  });
});
