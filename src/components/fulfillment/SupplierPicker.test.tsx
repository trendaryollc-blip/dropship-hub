import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockUser: any = { uid: "test-uid" };
let mockSuppliersData: any = null;
let mockAssignmentData: any = null;
let mockUseAPIImpl: ((url: string | null) => any) | null = null;

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn().mockImplementation((url: string | null) => {
    if (mockUseAPIImpl) return mockUseAPIImpl(url);
    if (!url) return { data: null, isLoading: false };
    if (url.includes("/api/suppliers")) return { data: mockSuppliersData, isLoading: false };
    if (url.includes("/api/fulfillment/suppliers")) return { data: mockAssignmentData, isLoading: false };
    return { data: null, isLoading: false };
  }),
}));
vi.mock("lucide-react", () => ({
  Check: (p: any) => <div data-testid="icon-check" />,
  ChevronDown: (p: any) => <div data-testid="icon-chevron" />,
  X: (p: any) => <div data-testid="icon-x" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
}));

import { SupplierPicker } from "@/components/fulfillment/SupplierPicker";

describe("SupplierPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { uid: "test-uid" };
    mockSuppliersData = {
      suppliers: [
        { id: "cj-dropshipping", name: "CJ Dropshipping" },
        { id: "aliexpress", name: "AliExpress" },
      ],
    };
    mockAssignmentData = null;
    mockUseAPIImpl = null;
  });

  it("renders Assign Supplier button when no assignment", () => {
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    expect(screen.getByText("Assign Supplier")).toBeInTheDocument();
  });

  it("opens dropdown when Assign Supplier is clicked", () => {
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
  });

  it("fetches suppliers from API", () => {
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
  });

  it("calls safeFetch when a supplier is selected", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    fireEvent.click(screen.getByText("CJ Dropshipping"));
    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith("/api/fulfillment/suppliers", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("shows assigned supplier when assignment exists", () => {
    mockAssignmentData = {
      assignment: { supplierId: "cj-dropshipping", supplierName: "CJ Dropshipping", unitCost: 5.99, shippingCost: 2.50, source: "manual" },
    };
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
    expect(screen.getByText("$5.99")).toBeInTheDocument();
  });

  it("shows loading state when initially loading", () => {
    mockUseAPIImpl = (url: string | null) => {
      if (url?.includes("/api/fulfillment/suppliers")) return { data: null, isLoading: true };
      return { data: mockSuppliersData, isLoading: false };
    };
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    expect(screen.queryByText("Assign Supplier")).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows loading when fetching suppliers", () => {
    mockSuppliersData = null;
    mockUseAPIImpl = (url: string | null) => {
      if (url?.includes("/api/suppliers")) return { data: null, isLoading: true };
      if (url?.includes("/api/fulfillment/suppliers")) return { data: null, isLoading: false };
      return { data: null, isLoading: false };
    };
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    expect(screen.getByText("Loading suppliers...")).toBeInTheDocument();
  });

  it("shows no suppliers message when list is empty", () => {
    mockSuppliersData = { suppliers: [] };
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    expect(screen.getByText("No suppliers available")).toBeInTheDocument();
  });

  it("calls onAssigned callback after assignment", async () => {
    const onAssigned = vi.fn();
    render(<SupplierPicker productId="p1" productName="Test Product" onAssigned={onAssigned} />);
    fireEvent.click(screen.getByText("Assign Supplier"));
    fireEvent.click(screen.getByText("CJ Dropshipping"));
    await waitFor(() => {
      expect(onAssigned).toHaveBeenCalledWith(expect.objectContaining({
        supplierId: "cj-dropshipping",
        supplierName: "CJ Dropshipping",
      }));
    });
  });

  it("shows X button to clear assignment", () => {
    mockAssignmentData = {
      assignment: { supplierId: "cj-dropshipping", supplierName: "CJ Dropshipping", unitCost: 5.99, shippingCost: 2.50, source: "manual" },
    };
    render(<SupplierPicker productId="p1" productName="Test Product" />);
    expect(screen.getByTestId("icon-x")).toBeInTheDocument();
  });
});
