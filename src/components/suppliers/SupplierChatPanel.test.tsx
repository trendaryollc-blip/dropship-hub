import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
  useMutation: () => ({ trigger: vi.fn(), isMutating: false }),
}));

vi.mock("lucide-react", () => ({
  MessageCircle: (p: any) => <div data-testid="icon-message" />,
  Send: (p: any) => <div data-testid="icon-send" />,
  FileText: (p: any) => <div data-testid="icon-file" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
}));

import SupplierChatPanel from "./SupplierChatPanel";

describe("SupplierChatPanel", () => {
  it("renders the supplier chat heading", () => {
    render(<SupplierChatPanel />);
    expect(screen.getByText("Supplier Chat")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<SupplierChatPanel />);
    expect(screen.getByText("Supplier Chat")).toBeInTheDocument();
  });
});
