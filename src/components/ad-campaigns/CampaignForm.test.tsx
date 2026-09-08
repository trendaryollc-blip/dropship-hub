import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CampaignForm from "./CampaignForm";

vi.mock("@/hooks/useAPI", () => ({
  useMutation: vi.fn(() => ({ trigger: vi.fn().mockResolvedValue({}), isMutating: false })),
  revalidate: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  X: () => <div />,
  Loader2: () => <div />,
}));

import { useMutation } from "@/hooks/useAPI";

describe("CampaignForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields", () => {
    render(<CampaignForm onClose={vi.fn()} />);
    expect(screen.getByText("New Campaign")).toBeDefined();
    expect(screen.getByText("Campaign Name")).toBeDefined();
    expect(screen.getByText("Platform")).toBeDefined();
    expect(screen.getByText("Product Title")).toBeDefined();
    expect(screen.getByText("Daily Budget ($)")).toBeDefined();
    expect(screen.getByText("Start Date")).toBeDefined();
  });

  it("submit creates campaign", async () => {
    const trigger = vi.fn().mockResolvedValue({});
    (useMutation as any).mockReturnValue({ trigger, isMutating: false });
    const onClose = vi.fn();
    render(<CampaignForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Summer Sale/), { target: { value: "Test Campaign" } });
    fireEvent.change(screen.getByPlaceholderText(/Wireless Earbuds/), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Create Campaign"));

    expect(trigger).toHaveBeenCalled();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<CampaignForm onClose={onClose} />);
    const closeButtons = screen.getAllByRole("button");
    const xButton = closeButtons.find((btn) => btn.querySelector("div"));
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(<CampaignForm onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
