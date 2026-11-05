import { flushSync } from "react-dom";

/**
 * Animates items moving between sections (rayon ↔ panier) with a view transition, matched by
 * each row's `view-transition-name`. No animation when the user asks for reduced motion or the
 * browser can't.
 */
export function animateMove(update: () => void) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("startViewTransition" in document)) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

export function moveTransitionName(itemId: string) {
  return `item-${CSS.escape(itemId)}`;
}

/** Section headings slide with their rows instead of cross-fading between two places. */
export function headingTransitionName(sectionKey: string) {
  return `section-${CSS.escape(sectionKey)}`;
}
