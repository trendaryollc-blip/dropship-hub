import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BentoGrid, { BentoGridItem } from "./BentoGrid";
import { defaultLayout } from "./BentoLayoutPresets";

describe("BentoGrid", () => {
  it("renders children", () => {
    render(
      <BentoGrid layout={defaultLayout}>
        <div data-testid="child">Test</div>
      </BentoGrid>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies grid classes", () => {
    const { container } = render(
      <BentoGrid layout={defaultLayout}>
        <div>Content</div>
      </BentoGrid>
    );
    const grid = container.firstElementChild;
    expect(grid).toHaveClass("grid");
  });

  it("applies edit mode ring when editMode is true", () => {
    const { container } = render(
      <BentoGrid layout={defaultLayout} editMode={true}>
        <div>Content</div>
      </BentoGrid>
    );
    const grid = container.firstElementChild;
    expect(grid).toHaveClass("ring-2");
  });
});

describe("BentoGridItem", () => {
  const visibleItem = { id: "test", colSpan: 2 as const, rowSpan: 1 as const, visible: true };
  const hiddenItem = { id: "test", colSpan: 2 as const, rowSpan: 1 as const, visible: false };

  it("renders children when visible", () => {
    render(
      <BentoGridItem item={visibleItem}>
        <div data-testid="content">Hello</div>
      </BentoGridItem>
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders nothing when not visible", () => {
    const { container } = render(
      <BentoGridItem item={hiddenItem}>
        <div data-testid="content">Hello</div>
      </BentoGridItem>
    );
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("shows hide button in edit mode", () => {
    render(
      <BentoGridItem item={visibleItem} editMode={true} onToggleVisibility={() => {}}>
        <div>Content</div>
      </BentoGridItem>
    );
    expect(screen.getByText("Hide")).toBeInTheDocument();
  });

  it("hides hide button when not in edit mode", () => {
    render(
      <BentoGridItem item={visibleItem} editMode={false}>
        <div>Content</div>
      </BentoGridItem>
    );
    expect(screen.queryByText("Hide")).not.toBeInTheDocument();
  });
});
