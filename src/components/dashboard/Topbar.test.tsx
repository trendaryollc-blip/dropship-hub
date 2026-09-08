import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Topbar from "./Topbar";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", displayName: "Test User", getIdToken: vi.fn().mockResolvedValue("token") },
    signOut: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/theme/ThemeGallery", () => ({
  default: () => <div data-testid="theme-gallery" />,
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: any) => v,
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: { notifications: [], unreadCount: 0 }, mutate: vi.fn() })),
}));

vi.mock("lucide-react", () => ({
  Bell: () => <div />,
  Search: () => <div />,
  LogOut: () => <div />,
  ChevronDown: () => <div />,
  Menu: () => <div />,
  ArrowLeft: () => <div />,
  TrendingUp: () => <div />,
  AlertTriangle: () => <div />,
  Sparkles: () => <div />,
  AlertCircle: () => <div />,
  Info: () => <div />,
  Clock: () => <div />,
  X: () => <div />,
}));

describe("Topbar", () => {
  it("renders search input", () => {
    render(<Topbar onMenuToggle={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Search products/)).toBeDefined();
  });

  it("renders user initials", () => {
    render(<Topbar onMenuToggle={vi.fn()} />);
    expect(screen.getByText("TE")).toBeDefined();
  });

  it("sign out button", () => {
    render(<Topbar onMenuToggle={vi.fn()} />);
    const userBtn = screen.getByText("TE").closest("button");
    fireEvent.click(userBtn!);
    expect(screen.getByText("Sign Out")).toBeDefined();
  });

  it("notification bell", () => {
    const { container } = render(<Topbar onMenuToggle={vi.fn()} />);
    const btns = container.querySelectorAll("button");
    const notifBtn = Array.from(btns).find((b) => b.className.includes("p-2.5"));
    if (notifBtn) fireEvent.click(notifBtn);
    expect(screen.getByText("Notifications")).toBeDefined();
  });
});
