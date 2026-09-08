import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AiAutosetupTab from "./AiAutosetupTab";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => <div />,
  Loader2: () => <div />,
  Zap: () => <div />,
  Brain: () => <div />,
  AlertCircle: () => <div />,
}));

describe("AiAutosetupTab", () => {
  it("renders textarea", () => {
    render(<AiAutosetupTab onCreated={vi.fn()} />);
    expect(screen.getByText("AI Autosetup")).toBeDefined();
    expect(screen.getByPlaceholderText(/connect Temu/)).toBeDefined();
  });

  it("renders tips section", () => {
    render(<AiAutosetupTab onCreated={vi.fn()} />);
    expect(screen.getByText("Tips for best results")).toBeDefined();
  });

  it("submit button disabled when empty", () => {
    render(<AiAutosetupTab onCreated={vi.fn()} />);
    const btn = screen.getByText("AI: Create Connector").closest("button");
    expect(btn).toBeDisabled();
  });
});
