import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsTab from "./FulfillmentSettingsTab";
import { DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";
import type { FulfillmentSettings } from "@/types/fulfillment";

const mockSettings: FulfillmentSettings = {
  ...DEFAULT_FULFILLMENT_SETTINGS,
  autoApprove: { cj: true, aliexpress: false },
};

describe("FulfillmentSettingsTab", () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it("renders platform toggles", () => {
    render(<SettingsTab settings={mockSettings} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
  });

  it("toggle changes state", async () => {
    render(<SettingsTab settings={mockSettings} onSave={onSave} onClose={onClose} />);
    const cjText = screen.getByText("CJ Dropshipping");
    const platformRow = cjText.closest(".rounded-lg.bg-surface\\/50") || cjText.closest("div")?.parentElement?.parentElement;
    const toggle = platformRow?.querySelector("button");
    expect(toggle).toBeTruthy();
    await userEvent.click(toggle!);
  });

  it("save button calls onSave", async () => {
    render(<SettingsTab settings={mockSettings} onSave={onSave} onClose={onClose} />);
    await userEvent.click(screen.getByText("Save Settings"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("close button calls onClose", async () => {
    render(<SettingsTab settings={mockSettings} onSave={onSave} onClose={onClose} />);
    await userEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
