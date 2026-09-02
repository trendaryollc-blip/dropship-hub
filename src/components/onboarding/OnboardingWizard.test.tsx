import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingWizard from "./OnboardingWizard";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

describe("OnboardingWizard", () => {
  it("renders first step with niche selection", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText(/What do you sell/i)).toBeInTheDocument();
  });

  it("renders niche options", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Pet Supplies")).toBeInTheDocument();
    expect(screen.getByText("Electronics & Tech")).toBeInTheDocument();
    expect(screen.getByText("Fashion & Accessories")).toBeInTheDocument();
  });

  it("navigates to next step after selecting niche", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Pet Supplies"));
    fireEvent.click(screen.getByText(/Continue/));
    expect(screen.getByText(/Monthly ad budget/i)).toBeInTheDocument();
  });

  it("renders skip button", () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    expect(screen.getByText("Skip setup")).toBeInTheDocument();
  });
});
