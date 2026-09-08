import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreativeLibrary from "./CreativeLibrary";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: true })),
  useMutation: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
  revalidate: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Copy: () => <div />,
  Check: () => <div />,
  Trash2: () => <div />,
}));

import { useAPI } from "@/hooks/useAPI";

describe("CreativeLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    (useAPI as any).mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<CreativeLibrary />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state", () => {
    (useAPI as any).mockReturnValue({ data: { creatives: [] }, isLoading: false });
    render(<CreativeLibrary />);
    expect(screen.getByText("No creatives yet. Generate some above!")).toBeDefined();
  });

  it("renders creatives list", () => {
    (useAPI as any).mockReturnValue({
      data: {
        creatives: [
          { id: "c1", campaignId: "camp1", platform: "facebook", type: "headline", content: "Great Deal", aiProvider: "openai" },
          { id: "c2", campaignId: "camp1", platform: "facebook", type: "description", content: "Buy now", aiProvider: "openai" },
        ],
      },
      isLoading: false,
    });
    render(<CreativeLibrary />);
    expect(screen.getByText("Creative Library (2)")).toBeDefined();
    expect(screen.getByText("Great Deal")).toBeDefined();
    expect(screen.getByText("Buy now")).toBeDefined();
  });

  it("renders copy and delete buttons", () => {
    (useAPI as any).mockReturnValue({
      data: {
        creatives: [
          { id: "c1", campaignId: "camp1", platform: "facebook", type: "headline", content: "Test", aiProvider: "openai" },
        ],
      },
      isLoading: false,
    });
    const { container } = render(<CreativeLibrary />);
    expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
  });
});
