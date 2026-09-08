import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingBanner from "./OnboardingBanner";

vi.mock("next/link", () => {
  return {
    default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
      <a href={href} {...props}>{children}</a>
    ),
  };
});

describe("OnboardingBanner", () => {
  it("renders 3 onboarding steps", () => {
    render(<OnboardingBanner onDismiss={vi.fn()} />);
    expect(screen.getByText("Connect your store")).toBeInTheDocument();
    expect(screen.getByText("Assign suppliers")).toBeInTheDocument();
    expect(screen.getByText("Sync orders")).toBeInTheDocument();
  });

  it("calls onDismiss when X clicked", async () => {
    const onDismiss = vi.fn();
    render(<OnboardingBanner onDismiss={onDismiss} />);
    const closeButton = screen.getByRole("button");
    await userEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has links to /store and /products", () => {
    render(<OnboardingBanner onDismiss={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/store")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/products")).toBe(true);
  });
});
