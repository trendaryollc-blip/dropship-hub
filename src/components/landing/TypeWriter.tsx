"use client";

import { useState, useEffect, useRef } from "react";

interface TypeWriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  className?: string;
}

export default function TypeWriter({
  words,
  typingSpeed = 80,
  pauseTime = 2000,
  className = "",
}: TypeWriterProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentWord = words[currentWordIndex];

    // Phase 1: Typing
    if (!isDeleting && !isFading) {
      if (currentText.length < currentWord.length) {
        timeoutRef.current = setTimeout(() => {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        // Done typing — pause then start fading out
        timeoutRef.current = setTimeout(() => {
          setIsFading(true);
        }, pauseTime);
      }
    }

    // Phase 2: Fade out
    if (isFading) {
      timeoutRef.current = setTimeout(() => {
        setCurrentText("");
        setIsFading(false);
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }, 300);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentText, isDeleting, isFading, currentWordIndex, words, typingSpeed, pauseTime]);

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        className="transition-opacity duration-300 ease-in-out"
        style={{ opacity: isFading ? 0 : 1 }}
      >
        {currentText}
      </span>
      <span className="inline-block w-[3px] h-[0.85em] bg-accent ml-0.5 align-middle animate-pulse rounded-full" />
    </span>
  );
}
