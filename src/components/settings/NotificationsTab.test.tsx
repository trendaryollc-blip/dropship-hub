import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationsTab from "./NotificationsTab";

const mockNotifPrefs = {
  priceAlerts: true,
  stockAlerts: false,
  orderUpdates: true,
  aiRecommendations: false,
  weeklyDigest: true,
};

const defaultProps = {
  notifPrefs: mockNotifPrefs,
  onTogglePref: vi.fn(),
};

describe("NotificationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all notification toggles", () => {
    render(<NotificationsTab {...defaultProps} />);
    expect(screen.getByText("Price Drop Alerts")).toBeDefined();
    expect(screen.getByText("Stock Out Alerts")).toBeDefined();
    expect(screen.getByText("Order Updates")).toBeDefined();
    expect(screen.getByText("AI Recommendations")).toBeDefined();
    expect(screen.getByText("Weekly Digest")).toBeDefined();
  });

  it("toggle calls onTogglePref with correct key", () => {
    render(<NotificationsTab {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(defaultProps.onTogglePref).toHaveBeenCalledWith("priceAlerts");

    fireEvent.click(buttons[1]);
    expect(defaultProps.onTogglePref).toHaveBeenCalledWith("stockAlerts");

    fireEvent.click(buttons[4]);
    expect(defaultProps.onTogglePref).toHaveBeenCalledWith("weeklyDigest");
  });

  it("shows current state via toggle visual", () => {
    const { container } = render(<NotificationsTab {...defaultProps} />);
    const toggleButtons = container.querySelectorAll("button");
    expect(toggleButtons.length).toBe(5);

    expect(toggleButtons[0].className).toContain("bg-accent");
    expect(toggleButtons[1].className).toContain("bg-surface");
    expect(toggleButtons[2].className).toContain("bg-accent");
    expect(toggleButtons[3].className).toContain("bg-surface");
    expect(toggleButtons[4].className).toContain("bg-accent");
  });

  it("renders notification preferences header", () => {
    render(<NotificationsTab {...defaultProps} />);
    expect(screen.getByText("Notification Preferences")).toBeDefined();
  });

  it("renders toggle descriptions", () => {
    render(<NotificationsTab {...defaultProps} />);
    expect(screen.getByText("Get notified when monitored product prices drop")).toBeDefined();
    expect(screen.getByText("Get notified when products go out of stock")).toBeDefined();
    expect(screen.getByText("Get notified about order status changes")).toBeDefined();
    expect(screen.getByText("Get daily AI-powered product recommendations")).toBeDefined();
    expect(screen.getByText("Receive a weekly summary of your store performance")).toBeDefined();
  });

  it("all toggles are functional buttons", () => {
    render(<NotificationsTab {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
  });
});
