"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

function getTargetElement(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

function calculatePopoverPosition(
  target: HTMLElement,
  placement: "top" | "bottom" | "left" | "right"
): { top: number; left: number; arrow: string } {
  const rect = target.getBoundingClientRect();
  const gap = 12;
  let top = 0;
  let left = 0;
  let arrow = "";

  switch (placement) {
    case "top":
      top = rect.top + window.scrollY - gap;
      left = rect.left + window.scrollX + rect.width / 2;
      arrow = "bottom";
      break;
    case "bottom":
      top = rect.bottom + window.scrollY + gap;
      left = rect.left + window.scrollX + rect.width / 2;
      arrow = "top";
      break;
    case "left":
      top = rect.top + window.scrollY + rect.height / 2;
      left = rect.left + window.scrollX - gap;
      arrow = "right";
      break;
    case "right":
      top = rect.top + window.scrollY + rect.height / 2;
      left = rect.right + window.scrollX + gap;
      arrow = "left";
      break;
  }

  return { top, left, arrow };
}

export default function Tour({ steps, isOpen, onComplete, onSkip }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, arrow: "top" });
  const [highlight, setHighlight] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [visible, setVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;

    const target = getTargetElement(step.target);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    setTimeout(() => {
      const updatedTarget = getTargetElement(step.target);
      if (!updatedTarget) return;

      const rect = updatedTarget.getBoundingClientRect();
      setHighlight({
        top: rect.top + window.scrollY - 4,
        left: rect.left + window.scrollX - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      });

      const pos = calculatePopoverPosition(updatedTarget, step.placement || "bottom");
      setPosition(pos);
    }, 300);
  }, [currentStep, steps]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      updatePosition();
    }
  }, [isOpen, currentStep, updatePosition]);

  useEffect(() => {
    if (!visible) return;

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [visible, updatePosition]);

  const handleNext = useCallback(() => {
    if (currentStep === steps.length - 1) {
      onComplete();
      setVisible(false);
    } else {
      setCurrentStep((p) => p + 1);
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  }, [currentStep]);

  useEffect(() => {
    if (!visible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, handleNext, handlePrev, onSkip]);

  if (!isOpen || !visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[2px] transition-opacity" onClick={onSkip} />

      <div
        className="fixed z-[160] border-2 border-accent/60 rounded-xl transition-all duration-300 ease-out"
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)",
        }}
      />

      <div
        ref={popoverRef}
        className="fixed z-[170] w-72 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
        style={{
          top: position.arrow === "top" ? position.top : undefined,
          bottom: position.arrow === "bottom" ? undefined : undefined,
          left: position.arrow === "left" || position.arrow === "right" ? undefined : position.left - 144,
          transform: position.arrow === "left" || position.arrow === "right" ? `translateY(-50%)` : undefined,
          ...(position.arrow === "top" && { top: position.top }),
          ...(position.arrow === "bottom" && { top: position.top }),
          ...(position.arrow === "left" && { left: position.left - 288 }),
          ...(position.arrow === "right" && { left: position.left }),
        }}
      >
        <div className="relative bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-emerald-400 to-accent" />

          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-3 w-3 text-accent" />
                </div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={onSkip}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <h4 className="font-display text-sm font-bold text-foreground mb-1">{step.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.content}</p>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? "w-6 bg-accent" : i < currentStep ? "w-1.5 bg-accent/40" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
                  >
                    <ChevronLeft className="h-3 w-3" /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 transition-all"
                >
                  {isLast ? "Get Started" : "Next"} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function useTour(tourKey: string) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`tour_${tourKey}`);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [tourKey]);

  const complete = useCallback(() => {
    localStorage.setItem(`tour_${tourKey}`, "done");
    setIsOpen(false);
  }, [tourKey]);

  const skip = useCallback(() => {
    localStorage.setItem(`tour_${tourKey}`, "skipped");
    setIsOpen(false);
  }, [tourKey]);

  const restart = useCallback(() => {
    localStorage.removeItem(`tour_${tourKey}`);
    setIsOpen(true);
  }, [tourKey]);

  return { isOpen, complete, skip, restart };
}
