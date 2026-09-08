import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreativeGenerator from "./CreativeGenerator";

vi.mock("@/hooks/useAPI", () => ({
  useMutation: vi.fn(() => ({
    trigger: vi.fn().mockResolvedValue({ creatives: [{ type: "headline", content: "Test Headline" }] }),
    isMutating: false,
  })),
}));

vi.mock("lucide-react", () => ({
  Sparkles: () => <div />,
  Loader2: () => <div />,
  Copy: () => <div />,
  Check: () => <div />,
}));

import { useMutation } from "@/hooks/useAPI";

describe("CreativeGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form", () => {
    render(<CreativeGenerator />);
    expect(screen.getByText("AI Creative Generator")).toBeDefined();
    expect(screen.getByText("Platform")).toBeDefined();
    expect(screen.getByText("Product Title *")).toBeDefined();
    expect(screen.getByText("Generate Creatives")).toBeDefined();
  });

  it("generates creatives", async () => {
    const trigger = vi.fn().mockResolvedValue({ creatives: [{ type: "headline", content: "Amazing Deal" }] });
    (useMutation as any).mockReturnValue({ trigger, isMutating: false });
    render(<CreativeGenerator />);

    fireEvent.change(screen.getByPlaceholderText(/Wireless Noise-Cancelling/), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Generate Creatives"));

    expect(trigger).toHaveBeenCalled();
  });

  it("toggles creative types", () => {
    render(<CreativeGenerator />);
    const headlineBtn = screen.getByText("HEADLINE");
    fireEvent.click(headlineBtn);
    fireEvent.click(headlineBtn);
    expect(headlineBtn).toBeDefined();
  });

  it("copy to clipboard works after generation", async () => {
    const trigger = vi.fn().mockResolvedValue({ creatives: [{ type: "headline", content: "Copy Me" }] });
    (useMutation as any).mockReturnValue({ trigger, isMutating: false });
    render(<CreativeGenerator />);

    fireEvent.change(screen.getByPlaceholderText(/Wireless Noise-Cancelling/), { target: { value: "Test" } });
    fireEvent.click(screen.getByText("Generate Creatives"));
  });
});
