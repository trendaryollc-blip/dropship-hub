import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "admin@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: (props: any) => (
    <div data-testid="confirm-dialog">
      {props.open && (
        <div>
          <span>{props.title}</span>
          <button onClick={props.onConfirm}>Confirm</button>
          <button onClick={props.onCancel}>Cancel</button>
        </div>
      )}
    </div>
  ),
}));

import AdminAiKeysPage from "./page";
import { safeFetch } from "@/lib/safe-fetch";

const mockProviders = {
  groq: {
    keys: [
      {
        id: "key-1", key: "gsk_abc123def456ghi789", label: "Primary", priority: 1,
        requestsUsed: 100, requestsLimit: 1000, resetDate: "2026-10-01",
        lastError: null, lastStatus: "healthy", masked: "••••789",
      },
    ],
    configured: true,
  },
  gemini: { keys: [], configured: false },
  openai: { keys: [], configured: false },
  deepseek: { keys: [], configured: false },
  mistral: { keys: [], configured: false },
  cohere: { keys: [], configured: false },
  together: { keys: [], configured: false },
  fireworks: { keys: [], configured: false },
  openrouter: { keys: [], configured: false },
  huggingface: { keys: [], configured: false },
  hpc: { keys: [], configured: false },
};

describe("Admin AI Keys Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(safeFetch).mockReturnValue(new Promise(() => {}));
    render(<AdminAiKeysPage />);
    expect(screen.getByText("Loading AI provider keys...")).toBeDefined();
  });

  it("renders page header after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("AI Provider Keys")).toBeDefined();
    });
  });

  it("renders stats cards after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Total Keys")).toBeDefined();
      expect(screen.getByText("Healthy")).toBeDefined();
      expect(screen.getByText("Errors")).toBeDefined();
      expect(screen.getByText("Providers")).toBeDefined();
    });
  });

  it("renders all 11 AI providers", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
      expect(screen.getByText("Google Gemini")).toBeDefined();
      expect(screen.getByText("OpenAI")).toBeDefined();
      expect(screen.getByText("DeepSeek")).toBeDefined();
      expect(screen.getByText("Mistral AI")).toBeDefined();
      expect(screen.getByText("Cohere")).toBeDefined();
      expect(screen.getByText("Together AI")).toBeDefined();
      expect(screen.getByText("Fireworks AI")).toBeDefined();
      expect(screen.getByText("OpenRouter")).toBeDefined();
      expect(screen.getByText("Hugging Face")).toBeDefined();
      expect(screen.getByText("HPC AI")).toBeDefined();
    });
  });

  it("displays free tier badges for Groq", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("14,400 req/day")).toBeDefined();
      expect(screen.getByText("1,500 req/day")).toBeDefined();
    });
  });

  it("shows key count badge when keys exist", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("1 key")).toBeDefined();
    });
  });

  it("expands provider when Keys button clicked", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
    });
  });

  it("shows empty state when no keys configured", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Google Gemini")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[1]);

    await waitFor(() => {
      expect(screen.getByText("No API keys configured")).toBeDefined();
    });
  });

  it("shows Add Key form when Add Key button clicked", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const addKeyButtons = screen.getAllByText("Add Key");
    fireEvent.click(addKeyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Add New API Key")).toBeDefined();
      expect(screen.getByPlaceholderText("Enter API key")).toBeDefined();
    });
  });

  it("shows key visibility toggle with masked key", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
      expect(screen.getByText("gsk_abc1••••••••••••i789")).toBeDefined();
    });
  });

  it("shows health status indicator for healthy keys", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("HEALTHY")).toBeDefined();
    });
  });

  it("shows usage progress bar", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("100/1000")).toBeDefined();
    });
  });

  it("calls safeFetch with correct auth headers", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith("/api/admin/ai-keys", {
        headers: { Authorization: "Bearer token" },
      });
    });
  });

  it("collapse button works correctly", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Groq")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
    });

    const collapseButtons = screen.getAllByText("Collapse");
    fireEvent.click(collapseButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Primary")).toBeNull();
    });
  });

  it("handles empty providers response", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: {} });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("AI Provider Keys")).toBeDefined();
    });
  });

  it("renders provider usedFor descriptions", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminAiKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Real-time price optimization")).toBeDefined();
      expect(screen.getByText("Product & market analysis")).toBeDefined();
    });
  });
});
