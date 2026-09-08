import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProvidersTab from "./ProvidersTab";
import type { AIProvider } from "./constants";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockProviders: AIProvider[] = [
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference",
    envKey: "GROQ_API_KEY",
    configured: true,
    active: true,
    features: ["Quick analysis"],
    freeTier: "14,400 req/day",
    priority: 2,
    website: "https://groq.com",
    usedFor: "Real-time price optimization",
    href: "/ai",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o-mini",
    envKey: "OPENAI_API_KEY",
    configured: false,
    active: false,
    features: ["Advanced reasoning"],
    freeTier: "Pay per use",
    priority: 1,
    website: "https://platform.openai.com",
    usedFor: "Advanced reasoning",
    href: "/ai",
  },
];

const defaultProps = {
  providers: mockProviders,
  apiKeys: {},
  showKeys: {},
  savedSlots: {},
  slotTestStatus: {},
  testingSlot: null,
  savingSlot: null,
  onToggleActive: vi.fn(),
  onPriorityChange: vi.fn(),
  onSaveApiKey: vi.fn(),
  onAddAdditionalKey: vi.fn(),
  onTestConnection: vi.fn(),
  onDeleteApiKey: vi.fn(),
  onShowKeys: vi.fn(),
  onApiKeyChange: vi.fn(),
};

describe("ProvidersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all providers sorted by priority", () => {
    render(<ProvidersTab {...defaultProps} />);
    const openai = screen.getByText("OpenAI");
    const groq = screen.getByText("Groq");
    expect(openai).toBeDefined();
    expect(groq).toBeDefined();

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0].textContent).toBe("OpenAI");
    expect(headings[1].textContent).toBe("Groq");
  });

  it("shows configured/not-configured status", () => {
    render(<ProvidersTab {...defaultProps} />);
    expect(screen.getAllByText("Configured").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Not configured").length).toBeGreaterThanOrEqual(1);
  });

  it("renders API key input and save button", () => {
    render(<ProvidersTab {...defaultProps} apiKeys={{ groq: [""], openai: [""] }} />);
    const saveButtons = screen.getAllByText("Save");
    expect(saveButtons.length).toBe(2);
  });

  it("calls onSaveApiKey with correct index when save button is clicked", () => {
    render(<ProvidersTab {...defaultProps} apiKeys={{ openai: ["test-key"] }} />);
    const saveButtons = screen.getAllByText("Save");
    fireEvent.click(saveButtons[0]);
    expect(defaultProps.onSaveApiKey).toHaveBeenCalledWith("openai", "test-key", 0);
  });

  it("test connection button calls onTestConnection with index", () => {
    render(<ProvidersTab {...defaultProps} apiKeys={{ openai: ["test-key"] }} />);
    const testButtons = screen.getAllByText("Test");
    expect(testButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(testButtons[0]);
    expect(defaultProps.onTestConnection).toHaveBeenCalledWith("openai", 0);
  });

  it("delete key button appears when slot is saved", () => {
    render(<ProvidersTab {...defaultProps} apiKeys={{ openai: ["some-key"] }} savedSlots={{ "openai:0": { masked: "xxxx1234" } }} />);
    const trashButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2")
    );
    expect(trashButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows key count badge when keys are saved", () => {
    render(<ProvidersTab {...defaultProps} savedSlots={{ "openai:0": { masked: "xxxx1234" }, "openai:1": { masked: "xxxx5678" } }} />);
    expect(screen.getByText("2 keys saved")).toBeDefined();
  });

  it("active/disabled toggle calls onToggleActive", () => {
    render(<ProvidersTab {...defaultProps} />);
    const disabledButtons = screen.getAllByText("Disabled");
    fireEvent.click(disabledButtons[0]);
    expect(defaultProps.onToggleActive).toHaveBeenCalledWith("openai");

    const activeButtons = screen.getAllByText("Active");
    fireEvent.click(activeButtons[0]);
    expect(defaultProps.onToggleActive).toHaveBeenCalledWith("groq");
  });

  it("shows priority for each provider", () => {
    render(<ProvidersTab {...defaultProps} />);
    expect(screen.getByText("Priority: 1")).toBeDefined();
    expect(screen.getByText("Priority: 2")).toBeDefined();
  });

  it("show/hide toggles per slot independently", () => {
    const { container } = render(
      <ProvidersTab
        {...defaultProps}
        apiKeys={{ openai: ["key-one", "key-two"] }}
        showKeys={{ "openai:0": true, "openai:1": false }}
      />
    );
    const inputs = container.querySelectorAll("input");
    const openaiInputs = Array.from(inputs).filter((i) => {
      const ph = i.getAttribute("placeholder") || "";
      return ph.includes("OPENAI") || ph.includes("Additional key");
    });
    expect(openaiInputs[0]?.getAttribute("type")).toBe("text");
    expect(openaiInputs[1]?.getAttribute("type")).toBe("password");
  });

  it("shows features for each provider", () => {
    render(<ProvidersTab {...defaultProps} />);
    expect(screen.getByText("Quick analysis")).toBeDefined();
    expect(screen.getAllByText("Advanced reasoning").length).toBeGreaterThanOrEqual(1);
  });
});
