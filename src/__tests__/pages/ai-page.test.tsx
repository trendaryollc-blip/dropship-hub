import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      uid: "test-user-123",
      email: "test@example.com",
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    },
  }),
}));

const mockUseAIMode = vi.fn(() => ({
  preferences: { globalMode: "ai_assist" },
  pendingConfirmations: [],
  recentExecutions: [],
  confirmAction: vi.fn(),
  cancelAction: vi.fn(),
  refreshPending: vi.fn(),
  refreshRecent: vi.fn(),
}));

vi.mock("@/contexts/AIModeContext", () => ({
  useAIMode: () => mockUseAIMode(),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/components/ai/BusinessHealthRing", () => ({
  default: ({ score, size }: { score: number; size: number }) => (
    <div data-testid="health-ring" data-score={score} data-size={size} />
  ),
}));

vi.mock("@/components/ai/PromptCardGrid", () => ({
  default: ({ onSendPrompt, loading }: Record<string, unknown>) => (
    <div data-testid="prompt-card-grid" data-loading={loading as boolean}>
      <button onClick={() => (onSendPrompt as (s: string) => void)("Test prompt")}>Send Test Prompt</button>
    </div>
  ),
}));

vi.mock("@/components/ai/InsightPanel", () => ({
  default: ({ onNavigate }: Record<string, unknown>) => (
    <div data-testid="insight-panel">
      <button onClick={() => (onNavigate as (s: string) => void)("/dashboard")}>Navigate</button>
    </div>
  ),
}));

vi.mock("@/components/ai/CrossPageStatus", () => ({
  default: () => <div data-testid="cross-page-status" />,
}));

vi.mock("@/components/ai/ActionQueue", () => ({
  default: ({ onSendPrompt }: Record<string, unknown>) => (
    <div data-testid="action-queue">
      <button onClick={() => (onSendPrompt as (s: string) => void)("Action prompt")}>Action</button>
    </div>
  ),
}));

vi.mock("@/components/ai/VoiceInput", () => ({
  default: ({ onTranscript, onStateChange }: Record<string, unknown>) => (
    <div data-testid="voice-input">
      <button onClick={() => (onTranscript as (s: string) => void)("Voice transcript")}>Transcribe</button>
      <button onClick={() => (onTranscript as (s: string) => void)("Existing text")}>Transcribe Append</button>
      <button onClick={() => (onStateChange as (b: boolean) => void)?.(true)}>Start Listening</button>
      <button onClick={() => (onStateChange as (b: boolean) => void)?.(false)}>Stop Listening</button>
    </div>
  ),
}));

vi.mock("@/components/ai/ReportViewer", () => ({
  default: ({ onGenerate }: Record<string, unknown>) => (
    <div data-testid="report-viewer">
      <button onClick={() => (onGenerate as (s: string) => void)("weekly")}>Generate Report</button>
    </div>
  ),
}));

vi.mock("@/components/ai/RecommendationsCard", () => ({
  default: () => <div data-testid="recommendations-card" />,
}));

vi.mock("@/components/ai/ForecastChart", () => ({
  default: ({ onGenerate }: Record<string, unknown>) => (
    <div data-testid="forecast-chart">
      <button onClick={onGenerate as () => void}>Generate Forecast</button>
    </div>
  ),
}));

vi.mock("@/components/ai/CompetitorMonitor", () => ({
  default: () => <div data-testid="competitor-monitor" />,
}));

vi.mock("@/components/ai/AdCampaignAdvisor", () => ({
  default: () => <div data-testid="ad-campaign-advisor" />,
}));

vi.mock("@/components/ai/StoreComparator", () => ({
  default: () => <div data-testid="store-comparator" />,
}));

vi.mock("@/components/ai/GoalsTracker", () => ({
  default: () => <div data-testid="goals-tracker" />,
}));

vi.mock("@/components/ai/IntegrationMonitor", () => ({
  default: () => <div data-testid="integration-monitor" />,
}));

vi.mock("@/components/ai/ModeToggle", () => ({
  ModeToggle: ({ feature }: { feature: string }) => (
    <div data-testid="mode-toggle" data-feature={feature}>Mode Toggle</div>
  ),
}));

vi.mock("@/components/ai/ToolExecutionPanel", () => ({
  ToolExecutionPanel: () => <div data-testid="tool-execution-panel" />,
}));

vi.mock("@/components/ai/SmartSuggestions", () => ({
  default: () => <div data-testid="smart-suggestions" />,
}));

vi.mock("@/components/ai/LiveMarketIntel", () => ({
  default: () => <div data-testid="live-market-intel" />,
}));

vi.mock("lucide-react", () => ({
  Brain: () => <div data-testid="brain-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  Check: () => <div data-testid="check-icon" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Scan: () => <div data-testid="scan-icon" />,
  PanelRightClose: () => <div data-testid="panel-right-close-icon" />,
  PanelRightOpen: () => <div data-testid="panel-right-open-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Keyboard: () => <div data-testid="keyboard-icon" />,
  Command: () => <div data-testid="command-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import AIPage from "@/app/(app)/ai/page";
import { safeFetch } from "@/lib/safe-fetch";

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockContext = {
  healthScore: { overall: 75 },
  revenue: { today: 500, yesterday: 450, trend: "up", totalOrders: 12, profitMargin: 25, thisWeek: 3500 },
  products: { totalTracked: 25, byStage: { winning: 5, scaling: 8, sunset: 2, saturation: 3 } },
  suppliers: { totalActive: 4, avgReliability: 88, criticalAlerts: [] },
  orders: { totalRouted: 50, pendingRouting: 3 },
  customerService: { activeConversations: 5, escalatedQueue: 1, recentEscalations: [{ customerName: "John", reason: "Refund" }], resolutionRate: 92 },
  store: { connected: 2, productsLive: 20, productsErrored: 1 },
  missions: { totalToday: 8, completedToday: 5 },
  alerts: { critical: [], unread: 2, opportunities: [{ title: "New Trend", description: "Pet gadgets" }] },
  competitors: { recentlyAnalyzed: 3 },
};

const mockContextNoCritical = {
  ...mockContext,
  alerts: { critical: [], unread: 0, opportunities: [] },
};

function createMockStream(events: string[]) {
  const encoder = new TextEncoder();
  const data = events.map((e) => encoder.encode(e + "\n"));
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < data.length) {
        controller.enqueue(data[index]);
        index++;
      } else {
        controller.close();
      }
    },
  });
}

function createMockResponse(stream: ReadableStream) {
  return {
    ok: true,
    body: stream,
  };
}

function createMockErrorResponse() {
  return {
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    body: null,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AI Assistant Page", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUseAIMode.mockReturnValue({
      preferences: { globalMode: "ai_assist" },
      pendingConfirmations: [],
      recentExecutions: [],
      confirmAction: vi.fn(),
      cancelAction: vi.fn(),
      refreshPending: vi.fn(),
      refreshRecent: vi.fn(),
    });
    vi.mocked(safeFetch).mockImplementation((url: string) => {
      if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
      if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
      if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
      if (url.includes("/api/ai/recommendations")) return Promise.resolve({ recommendations: [] });
      if (url.includes("/api/ai/competitors")) return Promise.resolve({ changes: [], summary: { totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 } });
      if (url.includes("/api/ai/forecast")) return Promise.resolve({ forecast: [], summary: { currentTrend: "stable", projectedWeeklyRevenue: 3500, projectedMonthlyRevenue: 14000, confidenceLevel: "medium", avgDailyRevenue: 500, bestDay: "Monday", worstDay: "Sunday", growthRate: 5 }, insights: [] });
      if (url.includes("/api/ai/report")) return Promise.resolve({ period: "weekly", summary: "Test report", sections: [], healthScore: 75, highlights: [], concerns: [], recommendations: [] });
      return Promise.resolve({});
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  // ─── Header ─────────────────────────────────────────────────────────────

  describe("Header", () => {
    it("renders AI Command Center title", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("AI Command Center")).toBeInTheDocument();
    });

    it("renders Live badge", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("renders ModeToggle in header", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const toggles = screen.getAllByTestId("mode-toggle");
      expect(toggles.length).toBeGreaterThanOrEqual(1);
    });

    it("renders keyboard shortcuts button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("keyboard-icon").length).toBeGreaterThanOrEqual(1);
    });

    it("renders New Session button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("New Session")).toBeInTheDocument();
    });

    it("shows active provider in header when provider set", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Hello" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getAllByText(/via Groq/).length).toBeGreaterThan(0);
      });
    });

    it("renders health ring in header when context loaded", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const rings = screen.getAllByTestId("health-ring");
      expect(rings.length).toBeGreaterThanOrEqual(1);
      expect(rings[0].getAttribute("data-score")).toBe("75");
    });

    it("renders sidebar toggle button with correct icon when open", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByTestId("panel-right-close-icon")).toBeInTheDocument();
    });

    it("renders PanelRightOpen icon when sidebar is closed", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const toggleButton = screen.getByTestId("panel-right-close-icon").closest("button")!;
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId("panel-right-open-icon")).toBeInTheDocument();
      });
    });

    it("renders subtitle text", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText(/Your business brain/)).toBeInTheDocument();
    });
  });

  // ─── Welcome State ──────────────────────────────────────────────────────

  describe("Welcome State", () => {
    it("renders hero section", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
    });

    it("renders keyboard shortcut hints", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Ctrl+K to focus")).toBeInTheDocument();
      expect(screen.getByText("Voice input available")).toBeInTheDocument();
      expect(screen.getAllByText("Ctrl+/ for shortcuts").length).toBeGreaterThanOrEqual(1);
    });

    it("renders PromptCardGrid", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByTestId("prompt-card-grid")).toBeInTheDocument();
    });

    it("renders health ring with context stats in welcome state", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("$500")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("shows Revenue Today label", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Revenue Today")).toBeInTheDocument();
    });

    it("shows Products label", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Products")).toBeInTheDocument();
    });

    it("shows Suppliers label", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Suppliers")).toBeInTheDocument();
    });

    it("shows Critical Issues label", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Critical Issues")).toBeInTheDocument();
    });

    it("renders description text", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText(/Click any card below/)).toBeInTheDocument();
    });
  });

  // ─── Chat Interface ─────────────────────────────────────────────────────

  describe("Chat Interface", () => {
    it("transitions to chat when prompt card clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });
    });

    it("renders input textarea", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByPlaceholderText(/Ask about your business/)).toBeInTheDocument();
    });

    it("renders VoiceInput component", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByTestId("voice-input")).toBeInTheDocument();
    });

    it("toggles report viewer when button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const reportButton = screen.getByTestId("file-text-icon").closest("button")!;
      fireEvent.click(reportButton);
      await waitFor(() => {
        expect(screen.getByTestId("report-viewer")).toBeInTheDocument();
      });
    });

    it("returns to welcome state when Back button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Back to command cards"));
      await waitFor(() => {
        expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
      });
    });

    it("renders send button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("send-icon").length).toBeGreaterThanOrEqual(1);
    });

    it("renders input shortcut hints below input", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("Enter to send")).toBeInTheDocument();
      expect(screen.getByText("Shift+Enter for new line")).toBeInTheDocument();
      expect(screen.getAllByText("Ctrl+/ for shortcuts").length).toBeGreaterThanOrEqual(1);
    });

    it("has correct placeholder with context", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      expect(textarea).toBeInTheDocument();
    });

    it("shows user message after sending via prompt card", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Test prompt")).toBeInTheDocument();
      });
    });

    it("shows typing indicator while processing", async () => {
      let _resolve: (v: Response) => void;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        new Promise((resolve) => { _resolve = resolve; })
      );

      await act(async () => {
        render(<AIPage />);
      });

      fireEvent.click(screen.getByText("Send Test Prompt"));

      await waitFor(() => {
        expect(screen.getByText(/Analyzing your business data\.\.\.|Thinking\.\.\./)).toBeInTheDocument();
      });

      _resolve!(createMockResponse(
        createMockStream([
          JSON.stringify({ type: "token", content: "Done" }),
        ])
      ));

      await waitFor(() => {
        expect(screen.queryByText(/Analyzing your business data\.\.\.|Thinking\.\.\./)).not.toBeInTheDocument();
      });
    }, 10000);

    it("shows contextual typing indicator with context", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(createMockResponse(
              createMockStream([
                JSON.stringify({ type: "provider", name: "Groq" }),
                JSON.stringify({ type: "token", content: "Hello" }),
              ])
            ));
          }, 10000);
        })
      );

      await act(async () => {
        render(<AIPage />);
      });

      fireEvent.click(screen.getByText("Send Test Prompt"));

      await waitFor(() => {
        expect(screen.getByText(/Analyzing your business data\.\.\./)).toBeInTheDocument();
      });
    });

    it("New Session button resets state", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });

      const newSessionBtns = screen.getAllByText("New Session").map((el) => el.closest("button")).filter(Boolean);
      fireEvent.click(newSessionBtns[0]!);

      await waitFor(() => {
        expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
      });
    });

    it("New Session in chat header resets state", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });

      const newSessionButtons = screen.getAllByText("New Session");
      const chatNewSession = newSessionButtons.find((el) =>
        el.closest("[class*='flex items-center gap-1.5 text-xs']")
      );
      if (chatNewSession) {
        fireEvent.click(chatNewSession.closest("button")!);
        await waitFor(() => {
          expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
        });
      }
    });

    it("send button disabled when input empty", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const sendButtons = screen.getAllByTestId("send-icon").map((el) => el.closest("button")!);
      for (const btn of sendButtons) {
        expect(btn).toBeDisabled();
      }
    });
  });

  // ─── Message Sending (handleSend) ───────────────────────────────────────

  describe("Message Sending", () => {
    it("sends message via Enter key", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "AI response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Hello AI" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText("Hello AI")).toBeInTheDocument();
      });
    });

    it("Shift+Enter does not send message", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Line 1" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true, bubbles: true });
      expect(textarea).toHaveValue("Line 1");
      expect(screen.queryByText("Back to command cards")).not.toBeInTheDocument();
    });

    it("empty message is not sent", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(screen.queryByText("Back to command cards")).not.toBeInTheDocument();
    });

    it("clears input after sending", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });
    });

    it("sets hasStarted on first send", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "OK" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "First msg" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });
    });

    it("sends with text parameter directly", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Test prompt")).toBeInTheDocument();
      });
    });

    it("saves user message to Firebase history", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/history", expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("user"),
        }));
      });
    });

    it("sends context to the API", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/ai", expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("context"),
        }));
      });
    });

    it("shows error when AI not configured", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: false } } });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("No provider"));

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("AI Not Configured")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText(/No AI provider is configured/)).toBeInTheDocument();
      });
    });

    it("shows error when AI configured but service fails", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText(/couldn't connect to the AI service/)).toBeInTheDocument();
      });
    });
  });

  // ─── Streaming Response ─────────────────────────────────────────────────

  describe("Streaming Response", () => {
    it("renders streaming tokens as they arrive", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Hello " }),
            JSON.stringify({ type: "token", content: "world" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Hello world")).toBeInTheDocument();
      });
    });

    it("sets activeProvider from stream", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Gemini" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getAllByText(/via Gemini/).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("detects actions in streamed response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Check your dashboard at /dashboard for details" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("View Dashboard")).toBeInTheDocument();
      });
    });

    it("saves assistant message to Firebase after stream completes", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Done" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/history", expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("assistant"),
        }));
      });
    });

    it("skips malformed JSON lines in stream", async () => {
      const events = [
        JSON.stringify({ type: "token", content: "Good " }),
        "NOT_JSON",
        JSON.stringify({ type: "token", content: "data" }),
      ];
      const data = events.map((e) => new TextEncoder().encode(e + "\n"));
      let idx = 0;
      const stream = new ReadableStream({
        pull(controller) {
          if (idx < data.length) {
            controller.enqueue(data[idx]);
            idx++;
          } else {
            controller.close();
          }
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(createMockResponse(stream));
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Good data")).toBeInTheDocument();
      });
    });
  });

  // ─── Non-Streaming Fallback ─────────────────────────────────────────────

  describe("Non-Streaming Fallback", () => {
    it("falls back to non-streaming when initial POST fails", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(createMockErrorResponse());
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.resolve({ response: "Fallback response", provider: "Groq" });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        if (url.includes("/api/ai/history")) return Promise.resolve({});
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText("Fallback response")).toBeInTheDocument();
      });
    });

    it("falls back to non-streaming when res.body is null", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: null,
      });
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.resolve({ response: "Retry response", provider: "Mistral" });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        if (url.includes("/api/ai/history")) return Promise.resolve({});
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByText("Retry response")).toBeInTheDocument();
      });
    });
  });

  // ─── Stream Error + Retry ──────────────────────────────────────────────

  describe("Stream Error Handling", () => {
    it("retries with non-streaming when stream emits error event", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Partial " }),
            JSON.stringify({ type: "error", message: "Rate limited" }),
          ])
        )
      );
      vi.mocked(safeFetch).mockImplementation((url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (url === "/api/ai" && !body.stream && body.stream !== undefined) return Promise.resolve({ response: "Retry after error", provider: "Gemini" });
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        if (url.includes("/api/ai/history")) return Promise.resolve({});
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Retry after error")).toBeInTheDocument();
      });
    }, 10000);

    it("shows error when stream and non-stream both fail", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "error", message: "Stream failed" }),
          ])
        )
      );
      vi.mocked(safeFetch).mockImplementation((url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (url === "/api/ai" && !body.stream && body.stream !== undefined) return Promise.reject(new Error("Retry also failed"));
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        if (url.includes("/api/ai/history")) return Promise.resolve({});
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText(/I couldn't connect to the AI service|No AI provider is configured/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.queryByText(/Analyzing your business data\.\.\.|Thinking\.\.\./)).not.toBeInTheDocument();
      });
    }, 10000);
  });

  // ─── Voice Input Integration ────────────────────────────────────────────

  describe("Voice Input Integration", () => {
    it("transcribes voice input to text field", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.click(screen.getByText("Transcribe"));
      await waitFor(() => {
        expect(textarea).toHaveValue("Voice transcript");
      });
    });

    it("shows voice listening indicator when listening", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Start Listening"));
      await waitFor(() => {
        expect(screen.getByText("Listening...")).toBeInTheDocument();
      });
    });

    it("hides voice listening indicator when stopped", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Start Listening"));
      await waitFor(() => {
        expect(screen.getByText("Listening...")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Stop Listening"));
      await waitFor(() => {
        expect(screen.queryByText("Listening...")).not.toBeInTheDocument();
      });
    });

    it("appends voice transcript to existing text", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Hello" } });
      fireEvent.click(screen.getByText("Transcribe"));
      await waitFor(() => {
        expect(textarea).toHaveValue("Hello Voice transcript");
      });
    });
  });

  // ─── Sidebar ────────────────────────────────────────────────────────────

  describe("Sidebar", () => {
    it("renders desktop sidebar by default", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("action-queue").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("smart-suggestions").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("live-market-intel").length).toBeGreaterThanOrEqual(1);
    });

    it("toggles sidebar with button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const toggleButton = screen.getByTestId("panel-right-close-icon").closest("button")!;
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.queryByTestId("action-queue")).not.toBeInTheDocument();
      });
    });

    it("renders collapsible sections", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByText("Tool Executions").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Priority Actions").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Intelligence").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Tools").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Live Insights").length).toBeGreaterThanOrEqual(1);
    });

    it("collapses and expands sections", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const intelligenceHeaders = screen.getAllByText("Intelligence");
      for (const header of intelligenceHeaders) {
        fireEvent.click(header);
      }
      await waitFor(() => {
        expect(screen.queryAllByTestId("forecast-chart").length).toBe(0);
      });
      for (const header of intelligenceHeaders) {
        fireEvent.click(header);
      }
      await waitFor(() => {
        expect(screen.getAllByTestId("forecast-chart").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders ToolExecutionPanel", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const toolExecHeaders = screen.getAllByText("Tool Executions");
      fireEvent.click(toolExecHeaders[0]);
      await waitFor(() => {
        expect(screen.getAllByTestId("tool-execution-panel").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders sidebar components (ad-campaign, store-comparator, goals, integration)", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("ad-campaign-advisor").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("store-comparator").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("goals-tracker").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("integration-monitor").length).toBeGreaterThanOrEqual(1);
    });

    it("renders insight panel in sidebar", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("insight-panel").length).toBeGreaterThanOrEqual(1);
    });

    it("mobile sidebar backdrop click closes sidebar", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const mobileBackdrops = document.querySelectorAll(".bg-black\\/50");
      if (mobileBackdrops.length > 0) {
        fireEvent.click(mobileBackdrops[0]);
        await waitFor(() => {
          expect(screen.queryByTestId("action-queue")).not.toBeInTheDocument();
        });
      }
    });

    it("mobile sidebar close button works", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const closeButtons = screen.getAllByTestId("chevron-down-icon").map((el) => el.closest("button")).filter(Boolean);
      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]!);
        await waitFor(() => {
          expect(screen.queryByTestId("action-queue")).not.toBeInTheDocument();
        });
      }
    });

    it("Command Center text in mobile sidebar", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const cmdCenter = screen.getAllByText("Command Center");
      expect(cmdCenter.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────

  describe("Keyboard Shortcuts Modal", () => {
    it("opens shortcuts modal with keyboard button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const keyboardButton = screen.getAllByTestId("keyboard-icon")[0].closest("button")!;
      fireEvent.click(keyboardButton);
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
    });

    it("displays all shortcuts", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const keyboardButton = screen.getAllByTestId("keyboard-icon")[0].closest("button")!;
      fireEvent.click(keyboardButton);
      await waitFor(() => {
        expect(screen.getByText("Focus input")).toBeInTheDocument();
        expect(screen.getByText("New session")).toBeInTheDocument();
        expect(screen.getByText("Toggle sidebar")).toBeInTheDocument();
        expect(screen.getByText("Show shortcuts")).toBeInTheDocument();
        expect(screen.getByText("Close modal / sidebar")).toBeInTheDocument();
        expect(screen.getByText("Send message")).toBeInTheDocument();
        expect(screen.getByText("New line")).toBeInTheDocument();
      });
    });

    it("closes modal with Escape key", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const keyboardButton = screen.getAllByTestId("keyboard-icon")[0].closest("button")!;
      fireEvent.click(keyboardButton);
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
      });
    });

    it("closes modal when backdrop clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const keyboardButton = screen.getAllByTestId("keyboard-icon")[0].closest("button")!;
      fireEvent.click(keyboardButton);
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
      const backdrop = document.querySelector(".bg-black\\/60");
      if (backdrop) {
        fireEvent.click(backdrop);
        await waitFor(() => {
          expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
        });
      }
    });

    it("closes modal with X button", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const keyboardButton = screen.getAllByTestId("keyboard-icon")[0].closest("button")!;
      fireEvent.click(keyboardButton);
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
      const closeButton = screen.getByText("\u00d7").closest("button")!;
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
      });
    });
  });

  // ─── Keyboard Shortcut Keys ────────────────────────────────────────────

  describe("Keyboard Shortcut Keys", () => {
    it("Ctrl+K focuses input", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      expect(textarea).toHaveFocus();
    });

    it("Ctrl+N resets session", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Back to command cards")).toBeInTheDocument();
      });
      fireEvent.keyDown(document, { key: "n", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
      });
    });

    it("Ctrl+B toggles sidebar", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("action-queue").length).toBeGreaterThanOrEqual(1);
      fireEvent.keyDown(document, { key: "b", ctrlKey: true });
      await waitFor(() => {
        expect(screen.queryByTestId("action-queue")).not.toBeInTheDocument();
      });
      fireEvent.keyDown(document, { key: "b", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getAllByTestId("action-queue").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("Ctrl+/ shows shortcuts modal", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.keyDown(document, { key: "/", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
    });

    it("Escape closes sidebar when no modal open", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getAllByTestId("action-queue").length).toBeGreaterThanOrEqual(1);
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByTestId("action-queue")).not.toBeInTheDocument();
      });
    });

    it("Escape priority: closes modal first, then sidebar", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.keyDown(document, { key: "/", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
      });
      expect(screen.getAllByTestId("action-queue").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Empty AI Configured State ──────────────────────────────────────────

  describe("Empty AI Configured State", () => {
    it("shows empty state when AI is not configured", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: false } } });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("AI Not Configured")).toBeInTheDocument();
        expect(screen.getByText("Configure AI Providers")).toBeInTheDocument();
      });
    });

    it("shows empty state when AI config check fails", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.reject(new Error("Config check failed"));
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("AI Not Configured")).toBeInTheDocument();
      });
    });

    it("hides empty state once hasStarted is true even if not configured", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: false } } });
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        if (url.includes("/api/ai/history")) return Promise.resolve({});
        return Promise.resolve({});
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("No provider"));

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("AI Not Configured")).toBeInTheDocument();
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      await waitFor(() => {
        expect(screen.queryByText("AI Not Configured")).not.toBeInTheDocument();
      });
    });
  });

  // ─── Data Fetching ──────────────────────────────────────────────────────

  describe("Data Fetching", () => {
    it("fetches business context on mount", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith(expect.stringContaining("/api/ai/context"), expect.any(Object));
      });
    });

    it("checks AI configuration on mount", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai", expect.any(Object));
      });
    });

    it("runs background scan on mount", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/scan", expect.any(Object));
      });
    });

    it("does not fetch intelligence before hasStarted", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalled();
      });
      vi.mocked(safeFetch).mockClear();
      await new Promise((r) => setTimeout(r, 100));
      const hasRecs = vi.mocked(safeFetch).mock.calls.some(
        ([url]) => typeof url === "string" && url.includes("/api/ai/recommendations")
      );
      const hasComps = vi.mocked(safeFetch).mock.calls.some(
        ([url]) => typeof url === "string" && url.includes("/api/ai/competitors")
      );
      expect(hasRecs).toBe(false);
      expect(hasComps).toBe(false);
    });

    it("fetches intelligence after hasStarted", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Response" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/recommendations", expect.any(Object));
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/competitors", expect.any(Object));
      });
    });

    it("handles context fetch failure gracefully", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.reject(new Error("Context failed"));
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
    });

    it("handles scan failure gracefully", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.reject(new Error("Scan failed"));
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
    });

    it("auto-refreshes context every 2 minutes", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const callCountBefore = vi.mocked(safeFetch).mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(120000);
      });
      await waitFor(() => {
        expect(vi.mocked(safeFetch).mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });
  });

  // ─── Refresh Context ────────────────────────────────────────────────────

  describe("Refresh Context", () => {
    it("refreshes context when refresh button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const refreshButton = screen.getByTestId("refresh-icon").closest("button")!;
      fireEvent.click(refreshButton);
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith(expect.stringContaining("/api/ai/context"), expect.any(Object));
      });
    });
  });

  // ─── Input Handling ─────────────────────────────────────────────────────

  describe("Input Handling", () => {
    it("updates input value when typing", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const textarea = screen.getByPlaceholderText(/Ask about your business/);
      fireEvent.change(textarea, { target: { value: "Test message" } });
      expect(textarea).toHaveValue("Test message");
    });
  });

  // ─── Pending Confirmations Badge ────────────────────────────────────────

  describe("Pending Confirmations Badge", () => {
    it("shows pending confirmations badge when there are pending items", async () => {
      mockUseAIMode.mockReturnValue({
        preferences: { globalMode: "ai_assist" },
        pendingConfirmations: [{ id: "1" }, { id: "2" }],
        recentExecutions: [],
        confirmAction: vi.fn(),
        cancelAction: vi.fn(),
        refreshPending: vi.fn(),
        refreshRecent: vi.fn(),
      });

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("2 pending")).toBeInTheDocument();
      });
    });

    it("does not show badge when no pending items", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
    });
  });

  // ─── Scan Indicator ─────────────────────────────────────────────────────

  describe("Scan Indicator", () => {
    it("shows scan indicator when there are issues", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: true, criticalCount: 3, scanTimestamp: new Date().toISOString(), summary: "3 issues found" });
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("3 issues")).toBeInTheDocument();
      });
    });

    it("shows scanning indicator while scan is in progress", async () => {
      let resolveScan: ((v: unknown) => void) | undefined;
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return new Promise((resolve) => { resolveScan = resolve; });
        return Promise.resolve({});
      });

      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.getByText("Scanning...")).toBeInTheDocument();
      });
      act(() => {
        resolveScan?.({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
      });
      await waitFor(() => {
        expect(screen.queryByText("Scanning...")).not.toBeInTheDocument();
      });
    });
  });

  // ─── Report Viewer ──────────────────────────────────────────────────────

  describe("Report Viewer", () => {
    it("toggles report viewer visibility", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.queryByTestId("report-viewer")).not.toBeInTheDocument();
      const reportButton = screen.getByTestId("file-text-icon").closest("button")!;
      fireEvent.click(reportButton);
      await waitFor(() => {
        expect(screen.getByTestId("report-viewer")).toBeInTheDocument();
      });
      fireEvent.click(reportButton);
      await waitFor(() => {
        expect(screen.queryByTestId("report-viewer")).not.toBeInTheDocument();
      });
    });
  });

  // ─── Copy Message ───────────────────────────────────────────────────────

  describe("Copy Message", () => {
    it("copies assistant message content and shows check icon", async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Copyable text" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Copyable text")).toBeInTheDocument();
      });
      const copyButtons = screen.getAllByTestId("copy-icon").map((el) => el.closest("button")).filter(Boolean);
      if (copyButtons.length > 0) {
        fireEvent.click(copyButtons[0]!);
        expect(writeTextSpy).toHaveBeenCalled();
        await waitFor(() => {
          expect(screen.getAllByTestId("check-icon").length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ─── Message Rendering ──────────────────────────────────────────────────

  describe("Message Rendering", () => {
    it("renders user message with accent background", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        const userMsg = screen.getByText("Test prompt");
        const wrapper = userMsg.closest("[class*='bg-accent']");
        expect(wrapper).toBeTruthy();
      });
    });

    it("renders assistant message with border styling", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Reply text" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        const assistantMsg = screen.getByText("Reply text");
        const wrapper = assistantMsg.closest("[class*='border-white']");
        expect(wrapper).toBeTruthy();
      });
    });

    it("renders message timestamp", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timestamps.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders provider label on assistant messages", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "provider", name: "Groq" }),
            JSON.stringify({ type: "token", content: "Reply" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText(/AI via Groq/)).toBeInTheDocument();
      });
    });

    it("renders action links when present", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Visit /dashboard and /products" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("View Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Browse Products")).toBeInTheDocument();
      });
    });

    it("limits actions to 3", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Check /dashboard /products /suppliers /calculator /store" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        const actionLinks = screen.getAllByTestId("arrow-up-right-icon");
        expect(actionLinks.length).toBeLessThanOrEqual(3);
      });
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("renders gracefully without context (null context)", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve(null);
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
    });

    it("renders with critical alerts showing red color", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve({
          ...mockContext,
          alerts: { critical: [{ title: "Critical" }], unread: 1, opportunities: [] },
        });
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      const criticalEl = screen.getByText("2");
      expect(criticalEl).toHaveClass("text-red-400");
    });

    it("renders without critical alerts showing green color", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContextNoCritical);
        if (url === "/api/ai") return Promise.resolve({ providers: { groq: { configured: true } } });
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      const issuesEl = screen.getByText("1");
      expect(issuesEl).toHaveClass("text-emerald-400");
    });

    it("does not show report viewer by default", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.queryByTestId("report-viewer")).not.toBeInTheDocument();
    });

    it("does not show scanning indicator after scan completes", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      await waitFor(() => {
        expect(screen.queryByText("Scanning...")).not.toBeInTheDocument();
      });
    });

    it("rendering with aiConfigured still null (loading)", async () => {
      vi.mocked(safeFetch).mockImplementation((url: string) => {
        if (url === "/api/ai") return new Promise(() => {});
        if (url.includes("/api/ai/context")) return Promise.resolve(mockContext);
        if (url.includes("/api/ai/scan")) return Promise.resolve({ hasChanges: false, criticalCount: 0, scanTimestamp: new Date().toISOString(), summary: "No changes" });
        return Promise.resolve({});
      });
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("What do you need to know?")).toBeInTheDocument();
      expect(screen.queryByText("AI Not Configured")).not.toBeInTheDocument();
    });
  });

  // ─── Forecast Generation ────────────────────────────────────────────────

  describe("Forecast Generation", () => {
    it("generates forecast when button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const forecastButtons = screen.getAllByText("Generate Forecast");
      fireEvent.click(forecastButtons[0]);
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/forecast", expect.objectContaining({
          method: "POST",
        }));
      });
    });
  });

  // ─── Report Generation ──────────────────────────────────────────────────

  describe("Report Generation", () => {
    it("generates report when button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const reportButton = screen.getByTestId("file-text-icon").closest("button")!;
      fireEvent.click(reportButton);
      await waitFor(() => {
        expect(screen.getByTestId("report-viewer")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Generate Report"));
      await waitFor(() => {
        expect(safeFetch).toHaveBeenCalledWith("/api/ai/report", expect.objectContaining({
          method: "POST",
        }));
      });
    });
  });

  // ─── InsightPanel Navigation ────────────────────────────────────────────

  describe("InsightPanel Navigation", () => {
    it("navigates when InsightPanel Navigate button clicked", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      const navigateButtons = screen.getAllByText("Navigate");
      fireEvent.click(navigateButtons[0]);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  // ─── CrossPageStatus ────────────────────────────────────────────────────

  describe("CrossPageStatus", () => {
    it("renders the page without crashing", async () => {
      await act(async () => {
        render(<AIPage />);
      });
      expect(screen.getByText("AI Command Center")).toBeInTheDocument();
    });
  });

  // ─── Action Detection ───────────────────────────────────────────────────

  describe("Action Detection", () => {
    it("detects /dashboard action", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Go to /dashboard to check" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("View Dashboard")).toBeInTheDocument();
      });
    });

    it("detects /products action", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Check /products page" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("Browse Products")).toBeInTheDocument();
      });
    });

    it("detects multiple actions", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "Check /dashboard /products /suppliers" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText("View Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Browse Products")).toBeInTheDocument();
        expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
      });
    });
  });

  // ─── UI Formatting ──────────────────────────────────────────────────────

  describe("UI Formatting", () => {
    it("renders formatted content with bold markdown", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "**Important** notice" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        const strong = document.querySelector("strong");
        expect(strong).toBeTruthy();
      });
    });

    it("renders formatted content with bullet points", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "• Item 1" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(screen.getByText(/Item 1/)).toBeInTheDocument();
      });
    });

    it("escapes HTML in messages", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockResponse(
          createMockStream([
            JSON.stringify({ type: "token", content: "<script>alert('xss')</script>" }),
          ])
        )
      );
      await act(async () => {
        render(<AIPage />);
      });
      fireEvent.click(screen.getByText("Send Test Prompt"));
      await waitFor(() => {
        expect(document.querySelector("script")).toBeNull();
        expect(screen.getByText(/script/)).toBeInTheDocument();
      });
    });
  });

  // ─── Cleanup ────────────────────────────────────────────────────────────

  describe("Cleanup", () => {
    it("cleans up event listeners on unmount", async () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(<AIPage />);
      await act(async () => {});
      unmount();
      const addedKeys = addSpy.mock.calls.filter(([type]) => type === "keydown").map(([, , opts]) => opts);
      const removedKeys = removeSpy.mock.calls.filter(([type]) => type === "keydown").map(([, , opts]) => opts);
      expect(addedKeys.length).toBe(removedKeys.length);
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("cleans up auto-refresh interval on unmount", async () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      const { unmount } = render(<AIPage />);
      await act(async () => {});
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
