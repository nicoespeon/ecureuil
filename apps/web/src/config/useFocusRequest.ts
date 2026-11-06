import { useRef } from "react";

/**
 * A focus asked for before the element exists: the action re-renders the screen, and the element
 * that mounts or updates next takes the focus once.
 */
export function useFocusRequest<Target extends string>() {
  const pending = useRef<Target | null>(null);
  return {
    request: (target: Target) => {
      pending.current = target;
    },
    take: (target: Target) => {
      if (pending.current !== target) return false;
      pending.current = null;
      return true;
    },
  };
}

export type FocusRequest<Target extends string> = ReturnType<typeof useFocusRequest<Target>>;
