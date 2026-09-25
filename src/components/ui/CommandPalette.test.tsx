import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommandPalette from "./CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette open={false} onOpenChange={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the command menu with a search input when open", () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens on Ctrl+K", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open={false} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("does not claim full AI chat when opening the store assistant", () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Open Store Assistant")).toBeInTheDocument();
    expect(screen.queryByText("AI Store Assistant")).not.toBeInTheDocument();
    expect(screen.getByText(/Opens the store chat panel/)).toBeInTheDocument();
  });

  it("shows an honest no-results message", () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Search commands...");
    fireEvent.change(input, { target: { value: "zzzzzzz" } });
    expect(screen.getByText("No matching commands.")).toBeInTheDocument();
  });
});
