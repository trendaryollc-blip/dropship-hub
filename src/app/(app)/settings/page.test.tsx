import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AISettingsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/settings/ProvidersTab", () => ({
  default: (props: any) => (
    <div data-testid="providers-tab">
      {props.providers.map((p: any) => <div key={p.id}>{p.name}</div>)}
    </div>
  ),
}));

vi.mock("@/components/settings/FeaturesTab", () => ({
  default: (props: any) => (
    <div data-testid="features-tab">
      {props.aiFeatures.map((f: any) => <div key={f.name}>{f.name}</div>)}
    </div>
  ),
}));

vi.mock("@/components/settings/PlatformsTab", () => ({
  default: (props: any) => (
    <div data-testid="platforms-tab">
      {props.platformConnectors.map((p: any) => <div key={p.id}>{p.name}</div>)}
    </div>
  ),
}));

vi.mock("@/components/settings/StoresTab", () => ({
  default: (props: any) => (
    <div data-testid="stores-tab">
      {props.stores.length === 0 ? (
        <div>No stores connected yet</div>
      ) : (
        props.stores.map((s: any) => <div key={s.id}>{s.name}</div>)
      )}
    </div>
  ),
}));

vi.mock("@/components/settings/NotificationsTab", () => ({
  default: (props: any) => (
    <div data-testid="notifications-tab">
      {Object.keys(props.notifPrefs).map((key) => (
        <div key={key}>{key}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/settings/AccountTab", () => ({
  default: (props: any) => (
    <div data-testid="account-tab">
      <span>{props.user?.email || "Not signed in"}</span>
      <input placeholder="New password" />
      <input placeholder="Confirm new password" />
    </div>
  ),
}));

vi.mock("@/components/settings/DataTab", () => ({
  default: (props: any) => (
    <div data-testid="data-tab">
      <button onClick={props.onExport}>Export</button>
      <button onClick={props.onImport}>Import</button>
    </div>
  ),
}));

vi.mock("@/components/settings/HowItWorksSection", () => ({
  default: () => <div data-testid="how-it-works-section">How It Works</div>,
}));

vi.mock("@/components/settings/SystemHealthPanel", () => ({
  default: () => <div data-testid="system-health-panel">System Health</div>,
}));

vi.mock("@/components/settings/SettingsChatSidebar", () => ({
  default: () => <div data-testid="settings-chat-sidebar">Chat Sidebar</div>,
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: (props: any) => (
    <div data-testid="confirm-dialog">
      {props.open && <span>Confirm Delete</span>}
    </div>
  ),
}));

describe("Settings Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header 'Settings'", () => {
    render(<AISettingsPage />);
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders quick links", () => {
    render(<AISettingsPage />);
    expect(screen.getByText("Try AI Assistant")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Products")).toBeDefined();
    expect(screen.getByText("Suppliers")).toBeDefined();
    expect(screen.getByText("Calculator")).toBeDefined();
    expect(screen.getByText("Competitors")).toBeDefined();
  });

  it("renders tab bar with all 5 tabs", () => {
    render(<AISettingsPage />);
    expect(screen.getByText("API Providers")).toBeDefined();
    expect(screen.getByText("Stores")).toBeDefined();
    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("Account")).toBeDefined();
    expect(screen.getByText("Data")).toBeDefined();
  });

  it("providers tab shows provider list", () => {
    render(<AISettingsPage />);
    expect(screen.getByTestId("providers-tab")).toBeDefined();
  });

  it("stores tab shows connected stores or empty state", () => {
    render(<AISettingsPage />);
    fireEvent.click(screen.getByText("Stores"));
    expect(screen.getByTestId("stores-tab")).toBeDefined();
    expect(screen.getByText("No stores connected yet")).toBeDefined();
  });

  it("notifications tab shows toggle preferences", () => {
    render(<AISettingsPage />);
    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.getByTestId("notifications-tab")).toBeDefined();
    expect(screen.getByText("priceAlerts")).toBeDefined();
    expect(screen.getByText("stockAlerts")).toBeDefined();
    expect(screen.getByText("orderUpdates")).toBeDefined();
    expect(screen.getByText("aiRecommendations")).toBeDefined();
    expect(screen.getByText("weeklyDigest")).toBeDefined();
  });

  it("account tab shows email and password fields", () => {
    render(<AISettingsPage />);
    fireEvent.click(screen.getByText("Account"));
    expect(screen.getByTestId("account-tab")).toBeDefined();
    expect(screen.getByText("test@test.com")).toBeDefined();
    expect(screen.getByPlaceholderText("New password")).toBeDefined();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeDefined();
  });

  it("data tab shows export/import buttons", () => {
    render(<AISettingsPage />);
    fireEvent.click(screen.getByText("Data"));
    expect(screen.getByTestId("data-tab")).toBeDefined();
    expect(screen.getByText("Export")).toBeDefined();
    expect(screen.getByText("Import")).toBeDefined();
  });

  it("tab switching works correctly", () => {
    render(<AISettingsPage />);

    expect(screen.getByTestId("providers-tab")).toBeDefined();
    expect(screen.queryByTestId("stores-tab")).toBeNull();

    fireEvent.click(screen.getByText("Stores"));
    expect(screen.getByTestId("stores-tab")).toBeDefined();
    expect(screen.queryByTestId("providers-tab")).toBeNull();

    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.getByTestId("notifications-tab")).toBeDefined();
    expect(screen.queryByTestId("stores-tab")).toBeNull();

    fireEvent.click(screen.getByText("Account"));
    expect(screen.getByTestId("account-tab")).toBeDefined();
    expect(screen.queryByTestId("notifications-tab")).toBeNull();

    fireEvent.click(screen.getByText("Data"));
    expect(screen.getByTestId("data-tab")).toBeDefined();
    expect(screen.queryByTestId("account-tab")).toBeNull();

    fireEvent.click(screen.getByText("API Providers"));
    expect(screen.getByTestId("providers-tab")).toBeDefined();
    expect(screen.queryByTestId("data-tab")).toBeNull();
  });
});
