import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function TestComponent() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("It worked!")}>Success</button>
      <button onClick={() => toast.error("Something broke")}>Error</button>
      <button onClick={() => toast.warning("Watch out")}>Warning</button>
      <button onClick={() => toast.info("FYI")}>Info</button>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders children", () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("shows success toast", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Success"));
    });
    expect(screen.getByText("It worked!")).toBeInTheDocument();
  });

  it("shows error toast", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Error"));
    });
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("shows warning toast", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Warning"));
    });
    expect(screen.getByText("Watch out")).toBeInTheDocument();
  });

  it("shows info toast", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Info"));
    });
    expect(screen.getByText("FYI")).toBeInTheDocument();
  });

  it("removes toast after duration", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Success"));
    });
    expect(screen.getByText("It worked!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("It worked!")).not.toBeInTheDocument();
  });

  it("removes toast on close button click", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Error"));
    });
    const closeButtons = screen.getAllByRole("button").filter((b) => !b.textContent);
    await act(async () => {
      fireEvent.click(closeButtons[closeButtons.length - 1]);
    });
    expect(screen.queryByText("Something broke")).not.toBeInTheDocument();
  });

  it("limits toasts to 5", async () => {
    function ManyToasts() {
      const toast = useToast();
      return (
        <button onClick={() => {
          for (let i = 0; i < 8; i++) toast.info(`Toast ${i}`);
        }}>Add many</button>
      );
    }
    render(
      <ToastProvider>
        <ManyToasts />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Add many"));
    });
    const toasts = screen.getAllByText(/^Toast \d$/);
    expect(toasts.length).toBeLessThanOrEqual(5);
  });
});
