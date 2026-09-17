"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = trigger.top + window.scrollY - tooltip.height - gap;
        left = trigger.left + window.scrollX + (trigger.width - tooltip.width) / 2;
        break;
      case "bottom":
        top = trigger.bottom + window.scrollY + gap;
        left = trigger.left + window.scrollX + (trigger.width - tooltip.width) / 2;
        break;
      case "left":
        top = trigger.top + window.scrollY + (trigger.height - tooltip.height) / 2;
        left = trigger.left + window.scrollX - tooltip.width - gap;
        break;
      case "right":
        top = trigger.top + window.scrollY + (trigger.height - tooltip.height) / 2;
        left = trigger.right + window.scrollX + gap;
        break;
    }

    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltip.width - padding));

    setCoords({ top, left });
  }, [position]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible) calculatePosition();
  }, [visible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const arrowClasses: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowBorders: Record<TooltipPosition, string> = {
    top: "border-t-foreground border-x-transparent border-b-transparent border-x-[5px] border-b-[5px] border-t-[5px]",
    bottom: "border-b-foreground border-x-transparent border-t-transparent border-x-[5px] border-t-[5px] border-b-[5px]",
    left: "border-l-foreground border-y-transparent border-r-transparent border-y-[5px] border-r-[5px] border-l-[5px]",
    right: "border-r-foreground border-y-transparent border-l-transparent border-y-[5px] border-l-[5px] border-r-[5px]",
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex ${className}`}
      >
        {children}
      </div>
      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[200] pointer-events-none animate-in fade-in-0 zoom-in-95"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-medium leading-tight whitespace-nowrap shadow-xl border border-foreground/20">
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-solid ${arrowClasses[position]} ${arrowBorders[position]}`}
          />
        </div>
      )}
    </>
  );
}
