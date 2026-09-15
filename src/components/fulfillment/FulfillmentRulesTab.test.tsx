import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RulesTab from "./FulfillmentRulesTab";
import type { FulfillmentRule } from "@/types/automation";

const mockRules: FulfillmentRule[] = [
  {
    id: "rule-1",
    name: "CJ Primary",
    description: "Route to CJ when in stock",
    enabled: true,
    priority: 1,
    conditions: [
      { field: "supplier_id", operator: "equals", value: "cj" },
      { field: "stock_level", operator: "greater_than", value: 0 },
    ],
    actions: [
      { type: "route_to_supplier", params: { supplierId: "cj" } },
      { type: "auto_approve", params: { enabled: true } },
    ],
    fallbackAction: { type: "route_to_supplier", params: { supplierId: "aliexpress" } },
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
];

describe("FulfillmentRulesTab", () => {
  let onToggle: ReturnType<typeof vi.fn>;
  let onCreateClick: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onToggle = vi.fn();
    onCreateClick = vi.fn();
    onDelete = vi.fn();
  });

  it("renders rules list", () => {
    render(<RulesTab rules={mockRules} onToggle={onToggle} loading={false} onCreateClick={onCreateClick} onDelete={onDelete} />);
    expect(screen.getByText("CJ Primary")).toBeInTheDocument();
    expect(screen.getByText("1 rules configured")).toBeInTheDocument();
  });

  it("toggle enables/disables rule", async () => {
    render(<RulesTab rules={mockRules} onToggle={onToggle} loading={false} onCreateClick={onCreateClick} onDelete={onDelete} />);
    const deleteBtn = screen.getByTitle("Delete rule");
    const toggleBtn = deleteBtn.previousElementSibling as HTMLButtonElement;
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledWith("rule-1", false);
  });

  it("shows conditions and actions", () => {
    render(<RulesTab rules={mockRules} onToggle={onToggle} loading={false} onCreateClick={onCreateClick} onDelete={onDelete} />);
    expect(screen.getByText("Conditions:")).toBeInTheDocument();
    expect(screen.getByText("Actions:")).toBeInTheDocument();
    expect(screen.getAllByText(/Route to Supplier/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Auto-Approve/)).toBeInTheDocument();
    expect(screen.getByText("Fallback:")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<RulesTab rules={[]} onToggle={onToggle} loading={false} onCreateClick={onCreateClick} onDelete={onDelete} />);
    expect(screen.getByText("No fulfillment rules yet")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    render(<RulesTab rules={[]} onToggle={onToggle} loading={true} onCreateClick={onCreateClick} onDelete={onDelete} />);
    expect(screen.queryByText("No fulfillment rules yet")).not.toBeInTheDocument();
  });
});
