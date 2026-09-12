import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockGetIdToken = vi.fn().mockResolvedValue("token");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  usePathname: () => "/admin/dashboard",
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/components/admin/AdminSidebar", () => ({
  default: ({ isOpen, onClose }: any) => (
    <div data-testid="admin-sidebar">
      <span>sidebar-open: {String(isOpen)}</span>
      <button onClick={onClose}>close-sidebar</button>
    </div>
  ),
}));

import AdminClientLayout from "./AdminLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

const mockUseAuth = vi.mocked(useAuth);

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signOut: vi.fn(),
    } as any);
    render(<AdminClientLayout><div>child</div></AdminClientLayout>);
    expect(screen.getByText("Verifying admin access...")).toBeDefined();
  });

  it("redirects to sign-in when not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    } as any);
    render(<AdminClientLayout><div>child</div></AdminClientLayout>);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/sign-in?callbackUrl="));
    });
  });

  it("shows access denied when not owner", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "user@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: false });
    render(<AdminClientLayout><div>child</div></AdminClientLayout>);
    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeDefined();
    });
  });

  it("shows Back to Dashboard button on access denied", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "user@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: false });
    render(<AdminClientLayout><div>child</div></AdminClientLayout>);
    await waitFor(() => {
      expect(screen.getByText("Back to Dashboard")).toBeDefined();
    });
  });

  it("renders admin shell when authorized", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "admin@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: true });
    render(<AdminClientLayout><div>child content</div></AdminClientLayout>);
    await waitFor(() => {
      expect(screen.getByText("child content")).toBeDefined();
    });
  });

  it("renders AdminSidebar component", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "admin@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: true });
    render(<AdminClientLayout><div>content</div></AdminClientLayout>);
    await waitFor(() => {
      expect(screen.getByTestId("admin-sidebar")).toBeDefined();
    });
  });

  it("renders Back to App button in topbar", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "admin@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: true });
    render(<AdminClientLayout><div>content</div></AdminClientLayout>);
    await waitFor(() => {
      expect(screen.getByText("Back to App")).toBeDefined();
    });
  });

  it("calls safeFetch to check owner status", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "test-uid", email: "admin@test.com", getIdToken: mockGetIdToken },
      loading: false,
      signOut: vi.fn(),
    } as any);
    vi.mocked(safeFetch).mockResolvedValue({ isOwner: true });
    render(<AdminClientLayout><div>content</div></AdminClientLayout>);
    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith("/api/auth/me", {
        headers: { Authorization: "Bearer token" },
      });
    });
  });
});
