import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterBar from "./FilterBar";

describe("FilterBar", () => {
  it("renders search input", () => {
    render(<FilterBar />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(<FilterBar searchPlaceholder="Find products..." />);
    expect(screen.getByPlaceholderText("Find products...")).toBeInTheDocument();
  });

  it("calls onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(<FilterBar onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("renders filter dropdowns", () => {
    render(
      <FilterBar
        filters={[
          { key: "category", label: "Category", options: [{ value: "all", label: "All" }, { value: "tech", label: "Tech" }] },
        ]}
      />
    );
    expect(screen.getByText("Category")).toBeInTheDocument();
  });
});
