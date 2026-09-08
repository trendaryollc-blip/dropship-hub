import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditTab from "./FulfillmentAuditTab";
import type { AuditLogEntry } from "@/types/automation";

const mockEntries: AuditLogEntry[] = [
  {
    id: "a1",
    orderId: "ORD-1001",
    action: "order_detected",
    details: "New order detected from Shopify",
    metadata: {},
    timestamp: "2025-01-15T10:00:00Z",
  },
  {
    id: "a2",
    orderId: "ORD-1002",
    action: "order_routed",
    details: "Routed to CJ Dropshipping",
    metadata: {},
    timestamp: "2025-01-15T11:00:00Z",
  },
  {
    id: "a3",
    orderId: "ORD-1003",
    action: "tracking_synced",
    details: "Tracking number synced to store",
    metadata: {},
    timestamp: "2025-01-15T12:00:00Z",
  },
];

describe("FulfillmentAuditTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders audit entries", () => {
    render(<AuditTab auditLog={mockEntries} loading={false} />);
    expect(screen.getByText("New order detected from Shopify")).toBeInTheDocument();
    expect(screen.getByText("Routed to CJ Dropshipping")).toBeInTheDocument();
    expect(screen.getByText("Tracking number synced to store")).toBeInTheDocument();
  });

  it("search filters entries", async () => {
    render(<AuditTab auditLog={mockEntries} loading={false} />);
    const searchInput = screen.getByPlaceholderText("Search audit log...");
    await userEvent.type(searchInput, "CJ");
    expect(screen.getByText("Routed to CJ Dropshipping")).toBeInTheDocument();
    expect(screen.queryByText("Tracking number synced to store")).not.toBeInTheDocument();
  });

  it("action type filter works", async () => {
    render(<AuditTab auditLog={mockEntries} loading={false} />);
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "tracking_synced");
    expect(screen.getByText("Tracking number synced to store")).toBeInTheDocument();
    expect(screen.queryByText("New order detected from Shopify")).not.toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<AuditTab auditLog={[]} loading={false} />);
    expect(screen.getByText("No audit entries found")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    render(<AuditTab auditLog={[]} loading={true} />);
    expect(screen.queryByText("No audit entries found")).not.toBeInTheDocument();
  });
});
