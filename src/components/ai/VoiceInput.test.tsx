import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VoiceInput from "./VoiceInput";

describe("VoiceInput", () => {
  it("renders null when speech recognition not supported", () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders button when speech recognition supported", () => {
    (window as any).SpeechRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: "",
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    }));
    render(<VoiceInput onTranscript={vi.fn()} />);
    expect(screen.getByLabelText("Voice input")).toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    (window as any).SpeechRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: "",
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    }));
    render(<VoiceInput onTranscript={vi.fn()} disabled />);
    expect(screen.getByLabelText("Voice input")).toBeDisabled();
  });

  it("toggles listening state on click", () => {
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    (window as any).SpeechRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: "",
      onresult: null,
      onerror: null,
      onend: null,
      start: mockStart,
      stop: mockStop,
      abort: vi.fn(),
    }));
    render(<VoiceInput onTranscript={vi.fn()} />);
    const button = screen.getByLabelText("Voice input");
    fireEvent.click(button);
    expect(mockStart).toHaveBeenCalled();
  });
});
