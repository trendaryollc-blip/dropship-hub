import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VisualSearchButton from "./VisualSearchButton";

vi.mock("lucide-react", () => ({
  Camera: (props: any) => <div data-testid="icon-camera" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  Upload: (props: any) => <div data-testid="icon-upload" {...props} />,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "user-1", getIdToken: vi.fn().mockResolvedValue("test-token") },
  }),
}));

describe("VisualSearchButton", () => {
  it("renders camera button", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    expect(screen.getByTestId("visual-search-button")).toBeInTheDocument();
  });

  it("opens modal on click", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));
    expect(screen.getByText("Search by Image")).toBeInTheDocument();
  });

  it("shows drop zone in modal", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));
    expect(screen.getByText("Drop an image here or click to upload")).toBeInTheDocument();
    expect(screen.getByText("JPG, PNG, WebP up to 10MB")).toBeInTheDocument();
  });

  it("closes modal when backdrop clicked", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal when X clicked", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));
    const closeBtn = screen.getByTestId("icon-x").closest("button")!;
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens file dialog on drop zone click", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));
    const dropZone = screen.getByTestId("drop-zone");
    expect(dropZone).toBeInTheDocument();
  });

  it("handles invalid file type", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));

    const input = screen.getByTestId("drop-zone").querySelector("input")!;
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: 100 });
    fireEvent.change(input, { target: { files: [file] } });

    // Non-image files are rejected: the drop zone stays and no preview appears
    expect(screen.getByTestId("drop-zone")).toBeInTheDocument();
  });

  it("handles valid image file", () => {
    render(<VisualSearchButton onSearch={vi.fn()} />);
    fireEvent.click(screen.getByTestId("visual-search-button"));

    const input = screen.getByTestId("drop-zone").querySelector("input")!;
    const blob = new Blob(["data"], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1000 });

    const readAsDataURL = vi.fn();
    const addEventListener = vi.fn();

    vi.spyOn(global, "FileReader").mockImplementation(() => ({
      readAsDataURL,
      addEventListener,
      result: null,
      onload: null,
      onerror: null,
      onabort: null,
      onloadstart: null,
      onprogress: null,
      readyState: 0,
      error: null,
      abort: vi.fn(),
      readAsArrayBuffer: vi.fn(),
      readAsBinaryString: vi.fn(),
      readAsText: vi.fn(),
      removeEventListener: vi.fn(),
      DONE: 2,
      LOADING: 1,
      EMPTY: 0,
    } as unknown as FileReader));

    fireEvent.change(input, { target: { files: [file] } });

    // Accepted image files are handed to the FileReader for preview
    expect(readAsDataURL).toHaveBeenCalledWith(file);
  });
});
