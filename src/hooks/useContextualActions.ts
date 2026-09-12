"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContextualAction } from "@/types/dashboard";

let actions: ContextualAction[] = [];
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function setContextualActions(newActions: ContextualAction[]) {
  actions = newActions;
  emitChange();
}

export function useContextualActions() {
  const [, rerender] = useState(0);

  useEffect(() => {
    function handleUpdate() {
      rerender((c) => c + 1);
    }
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return actions;
}
