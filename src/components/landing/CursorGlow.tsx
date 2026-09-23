"use client";

import { useEffect, useRef, useState } from "react";

export default function CursorGlow() {
  const [visible, setVisible] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateGlowColor = () => {
      const color = getComputedStyle(document.documentElement).getPropertyValue("--glow-color").trim();
      const c = color || "59,130,246";
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(circle, rgba(${c},0.06) 0%, transparent 70%)`;
      }
    };

    updateGlowColor();

    const observer = new MutationObserver(updateGlowColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const glow = glowRef.current;
      if (glow) {
        glow.style.left = `${e.clientX - 200}px`;
        glow.style.top = `${e.clientY - 200}px`;
      }
      setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="absolute rounded-full blur-[120px]"
        style={{
          left: -300,
          top: -300,
          width: 400,
          height: 400,
        }}
      />
    </div>
  );
}
