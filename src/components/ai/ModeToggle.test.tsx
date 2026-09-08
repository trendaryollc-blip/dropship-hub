import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeToggle, ModeToggleFull } from "./ModeToggle";

vi.mock("@/contexts/AIModeContext", () => ({
  useFeatureMode: vi.fn().mockReturnValue({ mode: "ai_assist", setMode: vi.fn() }),
}));

import { useFeatureMode } from "@/contexts/AIModeContext";
const mockSetMode = vi.fn();

describe("ModeToggle", () => {
  it("renders current mode", () => {
    (useFeatureMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: "ai_assist", setMode: mockSetMode });
    render(<ModeToggle feature="test" />);
    expect(screen.getByText("AI Assist")).toBeInTheDocument();
  });

  it("opens dropdown and shows all modes", () => {
    (useFeatureMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: "ai_assist", setMode: mockSetMode });
    render(<ModeToggle feature="test" />);
    fireEvent.click(screen.getByText("AI Assist"));
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("calls setMode on selection", () => {
    (useFeatureMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: "ai_assist", setMode: mockSetMode });
    render(<ModeToggle feature="test" />);
    fireEvent.click(screen.getByText("AI Assist"));
    fireEvent.click(screen.getByText("Auto"));
    expect(mockSetMode).toHaveBeenCalledWith("auto");
  });
});

describe("ModeToggleFull", () => {
  it("renders all modes", () => {
    (useFeatureMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: "ai_assist", setMode: mockSetMode });
    render(<ModeToggleFull feature="test" />);
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("AI Assist")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("calls setMode on click", () => {
    (useFeatureMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: "ai_assist", setMode: mockSetMode });
    render(<ModeToggleFull feature="test" />);
    fireEvent.click(screen.getByText("Auto"));
    expect(mockSetMode).toHaveBeenCalledWith("auto");
  });
});
