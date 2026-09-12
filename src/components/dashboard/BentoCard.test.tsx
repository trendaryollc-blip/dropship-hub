import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BentoCard from "./BentoCard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

describe("BentoCard", () => {
  it("renders children", () => {
    render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Card Content</p>
      </BentoCard>
    );
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("renders with data-bento-id attribute", () => {
    const { container } = render(
      <BentoCard id="my-card" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='my-card']");
    expect(card).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <BentoCard id="test" colSpan={1} rowSpan={1} title="Revenue">
        <p>Content</p>
      </BentoCard>
    );
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("renders icon when provided with title", () => {
    render(
      <BentoCard id="test" colSpan={1} rowSpan={1} title="Revenue" icon={<span data-testid="icon">ICON</span>}>
        <p>Content</p>
      </BentoCard>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(
      <BentoCard id="test" colSpan={1} rowSpan={1} action={<button>Action Btn</button>}>
        <p>Content</p>
      </BentoCard>
    );
    expect(screen.getByText("Action Btn")).toBeInTheDocument();
  });

  it("does not render header when no title or action", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    expect(container.querySelector(".flex.items-center.justify-between")).toBeNull();
  });

  it("applies colSpan classes for span 1", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("col-span-1");
  });

  it("applies colSpan classes for span 2", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={2} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("sm:col-span-2");
  });

  it("applies colSpan classes for span 3", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={3} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("lg:col-span-3");
  });

  it("applies colSpan classes for span 4", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={4} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("lg:col-span-4");
  });

  it("applies rowSpan classes for span 1", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("row-span-1");
  });

  it("applies rowSpan classes for span 2", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={2}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("sm:row-span-2");
  });

  it("applies rowSpan classes for span 3", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={3}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("lg:row-span-3");
  });

  it("applies custom className", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1} className="custom-class">
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("custom-class");
  });

  it("applies default empty className when none provided", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card).toBeInTheDocument();
  });

  it("applies transition classes for animation", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("transition-all");
    expect(card?.className).toContain("duration-500");
  });

  it("applies opacity and translate when in view", () => {
    const { container } = render(
      <BentoCard id="test" colSpan={1} rowSpan={1}>
        <p>Content</p>
      </BentoCard>
    );
    const card = container.querySelector("[data-bento-id='test']");
    expect(card?.className).toContain("opacity-100");
    expect(card?.className).toContain("translate-y-0");
  });
});
