import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommandPalette from "./CommandPalette";

// Mock the hook to control state
vi.mock("@/hooks/useCommandPalette", () => ({
  useCommandPalette: () => ({
    isOpen: false,
    query: "",
    results: [],
    selectedIndex: 0,
    open: vi.fn(),
    close: vi.fn(),
    setQuery: vi.fn(),
    setSelectedIndex: vi.fn(),
    selectNext: vi.fn(),
    selectPrev: vi.fn(),
    executeSelected: vi.fn(),
  }),
}));

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe("");
  });
});
