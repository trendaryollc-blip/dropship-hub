import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTab from "./DataTab";

const defaultProps = {
  exporting: false,
  importing: false,
  onExport: vi.fn(),
  onImport: vi.fn(),
};

describe("DataTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("export button calls onExport", () => {
    render(<DataTab {...defaultProps} />);
    const exportBtn = screen.getByText("Export");
    fireEvent.click(exportBtn);
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it("import button calls onImport", () => {
    render(<DataTab {...defaultProps} />);
    const importBtn = screen.getByText("Import");
    fireEvent.click(importBtn);
    expect(defaultProps.onImport).toHaveBeenCalled();
  });

  it("shows export button disabled when exporting", () => {
    render(<DataTab {...defaultProps} exporting={true} />);
    const exportBtn = screen.getByText("Export").closest("button");
    expect(exportBtn?.disabled).toBe(true);
  });

  it("shows import button disabled when importing", () => {
    render(<DataTab {...defaultProps} importing={true} />);
    const importBtn = screen.getByText("Import").closest("button");
    expect(importBtn?.disabled).toBe(true);
  });

  it("shows data export and import header", () => {
    render(<DataTab {...defaultProps} />);
    expect(screen.getByText("Data Export & Import")).toBeDefined();
  });

  it("shows export and import descriptions", () => {
    render(<DataTab {...defaultProps} />);
    expect(screen.getByText("Export Data")).toBeDefined();
    expect(screen.getByText("Download all your data as a JSON file")).toBeDefined();
    expect(screen.getByText("Import Data")).toBeDefined();
    expect(screen.getByText("Restore from a previously exported JSON file")).toBeDefined();
  });

  it("export and import buttons are enabled by default", () => {
    render(<DataTab {...defaultProps} />);
    const exportBtn = screen.getByText("Export").closest("button");
    const importBtn = screen.getByText("Import").closest("button");
    expect(exportBtn?.disabled).toBe(false);
    expect(importBtn?.disabled).toBe(false);
  });
});
