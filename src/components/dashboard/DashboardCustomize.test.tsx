import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardCustomize } from "./DashboardCustomize";
import type { DashboardSectionId } from "@/hooks/useDashboardSections";

vi.mock("lucide-react", () => {
  const I = () => null;
  return { Eye: I, RotateCcw: I };
});

describe("DashboardCustomize", () => {
  it("renders the Customize button", () => {
    render(<DashboardCustomize hidden={[]} onToggle={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /customize dashboard sections/i })).toBeInTheDocument();
  });

  it("shows hidden count when sections are hidden", () => {
    render(
      <DashboardCustomize hidden={["revenue", "orders"]} onToggle={vi.fn()} onReset={vi.fn()} />
    );
    expect(screen.getByText("2 hidden")).toBeInTheDocument();
  });

  it("opens the dialog and toggles a section", () => {
    const onToggle = vi.fn();
    render(<DashboardCustomize hidden={[]} onToggle={onToggle} onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /customize dashboard sections/i }));
    const checkbox = screen.getByRole("checkbox", { name: /show revenue & profit section/i });
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("revenue");
  });

  it("calls reset from the dialog", () => {
    const onReset = vi.fn();
    const hidden: DashboardSectionId[] = ["revenue"];
    render(<DashboardCustomize hidden={hidden} onToggle={vi.fn()} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: /customize dashboard sections/i }));
    fireEvent.click(screen.getByRole("button", { name: /show all sections/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    render(<DashboardCustomize hidden={[]} onToggle={vi.fn()} onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /customize dashboard sections/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
