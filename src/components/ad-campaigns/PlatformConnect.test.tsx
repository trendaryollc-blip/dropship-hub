import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformConnect from "./PlatformConnect";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: true })),
  useMutation: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
  revalidate: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Link2: () => <div />,
  Unlink: () => <div />,
  RefreshCw: () => <div />,
  Trash2: () => <div />,
  CheckCircle: () => <div />,
  AlertCircle: () => <div />,
  Loader2: () => <div />,
}));

import { useAPI } from "@/hooks/useAPI";

describe("PlatformConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    (useAPI as any).mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<PlatformConnect />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders facebook and google connect buttons", () => {
    (useAPI as any).mockReturnValue({ data: { connections: [] }, isLoading: false });
    render(<PlatformConnect />);
    expect(screen.getByText("Platform Connections")).toBeDefined();
    expect(screen.getByText("facebook Ads")).toBeDefined();
    expect(screen.getByText("google Ads")).toBeDefined();
  });

  it("shows connected state", () => {
    (useAPI as any).mockReturnValue({
      data: {
        connections: [
          { id: "conn1", platform: "facebook", accountId: "123", accountName: "My FB Account", status: "active", createdAt: "2025-01-01" },
        ],
      },
      isLoading: false,
    });
    render(<PlatformConnect />);
    expect(screen.getByText(/Connected.*My FB Account/)).toBeDefined();
  });
});
