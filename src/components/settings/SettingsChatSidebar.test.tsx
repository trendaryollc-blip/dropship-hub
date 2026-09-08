import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsChatSidebar from "./SettingsChatSidebar";
import type { AIProvider } from "./constants";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

const mockProviders: AIProvider[] = [
  {
    id: "groq", name: "Groq", description: "Fast", envKey: "GROQ_API_KEY",
    configured: true, active: true, features: ["Speed"], freeTier: "14K/day",
    priority: 1, website: "https://groq.com", usedFor: "Price optimization", href: "/ai",
  },
  {
    id: "openai", name: "OpenAI", description: "GPT", envKey: "OPENAI_API_KEY",
    configured: false, active: true, features: ["Reasoning"], freeTier: "Pay per use",
    priority: 2, website: "https://openai.com", usedFor: "Analysis", href: "/ai",
  },
];

describe("SettingsChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat toggle button", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    const toggleBtn = screen.getByTitle("Settings AI Assistant");
    expect(toggleBtn).toBeDefined();
  });

  it("opens sidebar when clicked", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    const toggleBtn = screen.getByTitle("Settings AI Assistant");
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Settings AI")).toBeDefined();
    expect(screen.getByText("Ask anything about your settings")).toBeDefined();
  });

  it("closes sidebar when toggle is clicked again", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    const toggleBtn = screen.getByTitle("Settings AI Assistant");
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Settings AI")).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Settings AI")).toBeNull();
  });

  it("displays provider context", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    expect(screen.getByText("1 provider configured")).toBeDefined();
  });

  it("has message input", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    const textarea = screen.getByPlaceholderText("Ask about your settings...");
    expect(textarea).toBeDefined();
  });

  it("displays quick prompts", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    expect(screen.getByText("Which provider should I configure first?")).toBeDefined();
    expect(screen.getByText("What are the free tier limits?")).toBeDefined();
    expect(screen.getByText("How does the fallback chain work?")).toBeDefined();
    expect(screen.getByText("Help me troubleshoot a connection")).toBeDefined();
  });

  it("has a send button", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    const sendButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-send")
    );
    expect(sendButtons.length).toBe(1);
  });

  it("send button is disabled when input is empty", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    const sendBtn = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-send")
    );
    expect(sendBtn?.disabled).toBe(true);
  });

  it("input accepts text and send button becomes enabled", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    const textarea = screen.getByPlaceholderText("Ask about your settings...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    const sendBtn = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-send")
    );
    expect(sendBtn?.disabled).toBe(false);
  });

  it("displays close button in sidebar header", () => {
    render(<SettingsChatSidebar providers={mockProviders} />);
    fireEvent.click(screen.getByTitle("Settings AI Assistant"));
    const closeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-x")
    );
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });
});
