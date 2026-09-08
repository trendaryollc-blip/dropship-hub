import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TemplatesTab from "./FulfillmentTemplatesTab";

const mockTemplates = [
  {
    id: "tpl-1",
    name: "CJ Standard Pack",
    description: "Standard CJ fulfillment template",
    supplier: "CJ Dropshipping",
    items: [
      { name: "Widget", unitCost: 8.5, quantity: 2 },
      { name: "Gadget", unitCost: 12.0, quantity: 1 },
    ],
    shippingMethod: "ePacket",
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "tpl-2",
    name: "Bulk AliExpress",
    description: "Bulk order template",
    supplier: "AliExpress",
    items: [
      { name: "Phone Case", unitCost: 2.5, quantity: 10 },
    ],
    shippingMethod: "China Post",
    createdAt: "2025-01-16T10:00:00Z",
  },
];

describe("FulfillmentTemplatesTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders templates list", () => {
    render(<TemplatesTab templates={mockTemplates} loading={false} />);
    expect(screen.getByText("CJ Standard Pack")).toBeInTheDocument();
    expect(screen.getByText("Bulk AliExpress")).toBeInTheDocument();
    expect(screen.getByText("2 templates saved")).toBeInTheDocument();
  });

  it("shows items and costs per template", () => {
    render(<TemplatesTab templates={mockTemplates} loading={false} />);
    expect(screen.getByText("Widget x2")).toBeInTheDocument();
    expect(screen.getByText("$17.00")).toBeInTheDocument();
    expect(screen.getByText("Phone Case x10")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("new template button present", () => {
    render(<TemplatesTab templates={mockTemplates} loading={false} />);
    expect(screen.getByText(/New Template/)).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<TemplatesTab templates={[]} loading={false} />);
    expect(screen.getByText("No fulfillment templates yet")).toBeInTheDocument();
    expect(screen.getByText("Create templates for recurring order patterns")).toBeInTheDocument();
  });
});
