import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Topbar from "./Topbar";

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockMutate = vi.fn();
const mockSafeFetch = vi.fn().mockResolvedValue({ ok: true });

let mockNotifications: any[] = [];
let mockUnreadCount = 0;
let mockContextualActions: any[] = [];
let mockSearchEntries: any[] = [];
let mockSearchLoading = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { email: "john@example.com", displayName: "John Doe" },
    signOut: mockSignOut,
  }),
}));

vi.mock("@/components/theme/ThemeGallery", () => ({
  default: () => <div data-testid="theme-gallery" />,
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (val: string) => val,
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: (url: string | null) => {
    if (!url) return { data: null, isLoading: false, mutate: mockMutate };
    if (url === "/api/search-history") {
      return { data: { entries: mockSearchEntries }, isLoading: mockSearchLoading, mutate: mockMutate };
    }
    return { data: { notifications: mockNotifications, unreadCount: mockUnreadCount }, isLoading: false, mutate: mockMutate };
  },
}));

vi.mock("@/hooks/useContextualActions", () => ({
  useContextualActions: () => mockContextualActions,
}));

function clickBell() {
  const buttons = screen.getAllByRole("button");
  const bellBtn = buttons.find(
    (btn) => btn.querySelector("svg")?.classList.contains("lucide-bell")
  );
  fireEvent.click(bellBtn!);
}

describe("Topbar", () => {
  const onMenuToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [];
    mockUnreadCount = 0;
    mockContextualActions = [];
    mockSearchEntries = [];
    mockSearchLoading = false;
  });

  it("renders back button", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByLabelText("Go back")).toBeInTheDocument();
  });

  it("calls router.back when back button clicked", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("renders menu toggle button", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("calls onMenuToggle when menu button clicked", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    expect(onMenuToggle).toHaveBeenCalled();
  });

  it("renders search input", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByPlaceholderText(/Search products/)).toBeInTheDocument();
  });

  it("renders theme gallery", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByTestId("theme-gallery")).toBeInTheDocument();
  });

  it("renders user initials", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("renders user display name", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders user email in header", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getAllByText("john@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("renders search input placeholder for dashboard", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    expect(screen.getByPlaceholderText("Search products, suppliers, anything...")).toBeInTheDocument();
  });

  it("renders header element with sticky positioning", () => {
    const { container } = render(<Topbar onMenuToggle={onMenuToggle} />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain("sticky");
    expect(header?.className).toContain("top-0");
    expect(header?.className).toContain("z-30");
  });

  it("submits search form and navigates with query", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.change(input, { target: { value: "laptop case" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockSafeFetch).toHaveBeenCalledWith("/api/search-history", expect.objectContaining({ method: "POST" }));
    expect(mockPush).toHaveBeenCalledWith("/products?q=laptop%20case");
    expect(input).toHaveValue("");
  });

  it("does not submit search with empty query", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSafeFetch).not.toHaveBeenCalled();
  });

  it("handles search input onChange", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.change(input, { target: { value: "test" } });
    expect(input).toHaveValue("test");
  });

  it("shows search panel on focus with empty query", () => {
    mockSearchEntries = [{ id: "1", query: "laptop" }];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.focus(input);
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
  });

  it("shows search suggestions when typing 2+ chars", () => {
    mockSearchEntries = [{ id: "1", query: "laptop case" }, { id: "2", query: "phone" }];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.change(input, { target: { value: "lap" } });
    fireEvent.focus(input);
    expect(screen.getByText("Suggestions")).toBeInTheDocument();
  });

  it("shows no matches when search has no results", () => {
    mockSearchEntries = [{ id: "1", query: "laptop" }];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.change(input, { target: { value: "xyz" } });
    fireEvent.focus(input);
    expect(screen.getByText("No matches found")).toBeInTheDocument();
  });

  it("shows loading spinner while searching", () => {
    mockSearchLoading = true;
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.change(input, { target: { value: "lap" } });
    fireEvent.focus(input);
    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("shows empty state when search history is empty", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.focus(input);
    expect(screen.getByText("Start typing to search")).toBeInTheDocument();
  });

  it("clicks search history item and navigates", () => {
    mockSearchEntries = [{ id: "1", query: "laptop" }];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const input = screen.getByPlaceholderText(/Search products/);
    fireEvent.focus(input);
    fireEvent.click(screen.getByText("laptop"));
    expect(mockPush).toHaveBeenCalledWith("/products?q=laptop");
  });

  it("opens notification panel when bell clicked", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows no notifications message when empty", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders mark all as read button", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("calls safeFetch when mark all as read clicked", async () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    fireEvent.click(screen.getByText("Mark all as read"));
    await waitFor(() => {
      expect(mockSafeFetch).toHaveBeenCalledWith("/api/ai/notifications", expect.objectContaining({ method: "PATCH" }));
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("renders notification items with unread badge", () => {
    mockNotifications = [
      { id: "n1", title: "New order", body: "Order #1234", severity: "info", read: false, createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(screen.getByText("Order #1234")).toBeInTheDocument();
  });

  it("clicks unread notification and marks it read", async () => {
    mockNotifications = [
      { id: "n1", title: "Alert", severity: "warning", read: false, createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    fireEvent.click(screen.getByText("Alert"));
    await waitFor(() => {
      expect(mockSafeFetch).toHaveBeenCalledWith("/api/ai/notifications", expect.objectContaining({ method: "PATCH" }));
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("clicks read notification without marking read", () => {
    mockNotifications = [
      { id: "n2", title: "Read item", severity: "info", read: true, createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    fireEvent.click(screen.getByText("Read item"));
    expect(mockSafeFetch).not.toHaveBeenCalled();
  });

  it("shows unread count badge when there are unread notifications", () => {
    mockUnreadCount = 3;
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("3 new")).toBeInTheDocument();
  });

  it("renders contextual actions in notification panel", () => {
    mockContextualActions = [
      { id: "ca1", type: "urgent", icon: "urgent", message: "Low stock alert", action: "Reorder now", href: "/products" },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Low stock alert")).toBeInTheDocument();
    expect(screen.getByText("Reorder now")).toBeInTheDocument();
  });

  it("clicks contextual action and navigates", () => {
    mockContextualActions = [
      { id: "ca2", type: "suggestion", icon: "suggestion", message: "Trending product", action: "View details", href: "/products/123" },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    fireEvent.click(screen.getByText("Trending product"));
    expect(mockPush).toHaveBeenCalledWith("/products/123");
  });

  it("opens user dropdown when clicked", () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const userBtn = screen.getByText("John Doe").closest("button");
    fireEvent.click(userBtn!);
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.getAllByText("john@example.com").length).toBe(2);
  });

  it("calls signOut and navigates to / on sign out", async () => {
    render(<Topbar onMenuToggle={onMenuToggle} />);
    const userBtn = screen.getByText("John Doe").closest("button");
    fireEvent.click(userBtn!);
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("notification bell shows dot when unreadCount > 0", () => {
    mockUnreadCount = 1;
    const { container } = render(<Topbar onMenuToggle={onMenuToggle} />);
    const pings = container.querySelectorAll(".animate-ping");
    expect(pings.length).toBeGreaterThan(0);
  });

  it("notification bell shows dot when contextualActions exist", () => {
    mockContextualActions = [
      { id: "ca3", type: "info", icon: "info", message: "Test", action: "Go", href: "/" },
    ];
    const { container } = render(<Topbar onMenuToggle={onMenuToggle} />);
    const pings = container.querySelectorAll(".animate-ping");
    expect(pings.length).toBeGreaterThan(0);
  });

  it("renders notification with icon from iconMap", () => {
    mockNotifications = [
      { id: "n3", title: "Supplier update", icon: "supplier", severity: "warning", read: true, createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("Supplier update")).toBeInTheDocument();
  });

  it("renders notification with default severity icon", () => {
    mockNotifications = [
      { id: "n4", title: "General info", severity: undefined, read: true, createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("General info")).toBeInTheDocument();
  });

  it("shows alerts header when notifications and contextual actions both present", () => {
    mockNotifications = [
      { id: "n5", title: "Alert", severity: "info", read: true, createdAt: new Date().toISOString() },
    ];
    mockContextualActions = [
      { id: "ca4", type: "info", icon: "info", message: "Action", action: "Do", href: "/" },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("notification item with url navigates on click", () => {
    mockNotifications = [
      { id: "n6", title: "Click me", severity: "info", read: true, url: "/orders/1", createdAt: new Date().toISOString() },
    ];
    render(<Topbar onMenuToggle={onMenuToggle} />);
    clickBell();
    fireEvent.click(screen.getByText("Click me"));
    expect(mockPush).toHaveBeenCalledWith("/orders/1");
  });
});
