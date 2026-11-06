import { useEffect, useState } from "react";

/** Long enough for a screen reader to speak the warning before it falls. */
const CONFIRMATION_MS = 10_000;

/**
 * A delete that takes two taps: the first arms it, the second confirms. It disarms after a while
 * or as soon as the focus leaves the button, whichever comes first.
 */
export function useConfirmation() {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRMATION_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  return {
    confirming,
    arm: () => setConfirming(true),
    onBlur: () => setConfirming(false),
  };
}
