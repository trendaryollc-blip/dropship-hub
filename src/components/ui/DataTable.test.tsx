import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable, { Column } from "./DataTable";

vi.mock("lucide-react", () => ({
  ChevronUp: () => <div />,
  ChevronDown: () => <div />,
}));

const columns: Column<any>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "value", label: "Value", sortable: true },
];

const data = [
  { name: "Alice", value: 10 },
  { name: "Bob", value: 20 },
];

describe("DataTable", () => {
  it("renders empty state", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No data available")).toBeDefined();
  });

  it("renders table with data", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("20")).toBeDefined();
  });

  it("sorts columns", () => {
    render(<DataTable columns={columns} data={data} />);
    fireEvent.click(screen.getByText("Name"));
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("calls onRowClick", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith({ name: "Alice", value: 10 });
  });
});
