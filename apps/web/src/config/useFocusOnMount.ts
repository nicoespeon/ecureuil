import { useEffect, useRef, useState } from "react";

/**
 * Switching screens unmounts the focused element: the new screen takes the focus once, when it
 * mounts, and never again on a later render.
 */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  const [focusOnMount] = useState(enabled);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  return ref;
}
