import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BackToTopButton from "./BackToTopButton";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, configurable: true, writable: true });
}

describe("BackToTopButton", () => {
  beforeEach(() => {
    setScrollY(0);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing until the page is scrolled past 500px", () => {
    render(<BackToTopButton />);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();

    setScrollY(600);
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();
  });

  it("hides again when scrolled back near the top", () => {
    render(<BackToTopButton />);
    setScrollY(600);
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();

    setScrollY(100);
    fireEvent.scroll(window);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
  });

  it("smoothly scrolls back to the top when clicked", () => {
    render(<BackToTopButton />);
    setScrollY(600);
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("removes its scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTopButton />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
