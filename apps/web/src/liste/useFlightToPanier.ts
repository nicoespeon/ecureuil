import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { flightTarget } from "./variante";

/**
 * A checked box leaves its row as a ball and arcs to the panier: the row lifts and melts into
 * the ball, then the panier row shows up as the ball lands. The article is in the panier from the
 * first instant (journal, screen readers): only its row waits, transparent, for the ball.
 * Nothing flies for who asks for less motion.
 */
export function useFlightToPanier(container: RefObject<HTMLElement | null>) {
  const [flying, setFlying] = useState<ReadonlySet<string>>(none);
  const takingOff = useRef<ReadonlyArray<TakeOff>>([]);

  // After the render that moved the row: the panier, and so the target, is in place.
  useLayoutEffect(() => {
    const launching = takingOff.current;
    if (launching.length === 0) return;
    takingOff.current = [];
    for (const takeOff of launching) {
      void fly(takeOff).then(() => {
        setFlying((current) => without(current, takeOff.articleId));
        popBox(boxOf(container.current, takeOff.articleId));
      });
    }
  });

  return {
    flying,
    /** Before the check: the row is measured where it stands. */
    takeOff: (articleId: string) => {
      const box = boxOf(container.current, articleId);
      if (!box || !canFly()) return;
      takingOff.current = [...takingOff.current, measure(box, articleId)];
      setFlying((current) => new Set([...current, articleId]));
    },
  };
}

const none: ReadonlySet<string> = new Set();

function without(ids: ReadonlySet<string>, id: string) {
  return new Set([...ids].filter((other) => other !== id));
}

function boxOf(container: HTMLElement | null, articleId: string) {
  return container?.querySelector<HTMLElement>(`input[data-article-id="${CSS.escape(articleId)}"]`);
}

function canFly() {
  return (
    typeof Element.prototype.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type TakeOff = {
  readonly articleId: string;
  readonly box: DOMRect;
  readonly row: DOMRect;
  /** The row as it looked, detached: React is about to move the real one. */
  readonly ghost: HTMLElement;
};

function measure(box: HTMLElement, articleId: string): TakeOff {
  const row = box.closest("li") ?? box;
  return {
    articleId,
    box: box.getBoundingClientRect(),
    row: row.getBoundingClientRect(),
    ghost: ghostOf(row),
  };
}

function ghostOf(row: HTMLElement) {
  const ghost = row.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) throw new Error("A row clones into an element");
  for (const element of [ghost, ...ghost.querySelectorAll("[id]")]) element.removeAttribute("id");
  ghost.querySelector("input")?.style.setProperty("visibility", "hidden");
  return ghost;
}

/** The row melts into its box, and the box flies off. Resolves when the ball lands. */
async function fly({ box, row, ghost }: TakeOff) {
  // The ball on top: the row melts under it.
  overlay(ghost, row);
  const ball = overlay(ballElement(), box);
  Object.assign(ghost.style, {
    background: "white",
    borderRadius: "var(--radius-pebble)",
    boxShadow: "var(--shadow-raised)",
    transformOrigin: `${box.left - row.left + box.width / 2}px 50%`,
  });

  const melt = ghost.animate(
    [
      { transform: "none", opacity: 1 },
      { transform: "scale(1.03)", opacity: 1, offset: 0.25 },
      { opacity: 0.9, offset: 0.7 },
      { transform: `scale(${box.width / row.width}, ${box.height / row.height})`, opacity: 0 },
    ],
    { duration: MELT_MS, easing: "ease-in" },
  );
  melt.finished.then(
    () => ghost.remove(),
    () => ghost.remove(),
  );

  const target = flightTarget();
  const landing = targetPoint(target, box);
  const flight = ball.animate(arc(center(box), landing.point, landing.scale), {
    duration: FLIGHT_MS,
    easing: "cubic-bezier(0.2, 0.1, 0.6, 1)",
    fill: "both",
  });
  await flight.finished.catch(() => undefined);
  ball.remove();
  landing.element?.animate(landing.hit, { duration: 320, easing: "ease-out" });
}

const MELT_MS = 260;
const FLIGHT_MS = 760;

/** Above the header and the bottom bar, out of the way of fingers and screen readers. */
function overlay(element: HTMLElement, at: DOMRect) {
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  Object.assign(element.style, {
    position: "fixed",
    left: `${at.left}px`,
    top: `${at.top}px`,
    width: `${at.width}px`,
    height: `${at.height}px`,
    margin: "0",
    zIndex: "40",
    pointerEvents: "none",
    listStyle: "none",
  });
  document.body.append(element);
  return element;
}

/** The checked box itself, so the ball is the same green pellet. */
function ballElement() {
  const ball = document.createElement("input");
  ball.type = "checkbox";
  ball.checked = true;
  ball.tabIndex = -1;
  ball.className = "clay-checkbox";
  return ball;
}

type Point = { readonly x: number; readonly y: number };

function center(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * A: the panier's heading, or the edge of the screen it hides behind. B: the cart of the
 * header, always in view, which jumps when hit.
 */
function targetPoint(target: "panier" | "chariot", box: DOMRect) {
  const element = document.querySelector<HTMLElement>(`[data-flight-target="${target}"]`);
  const rect = element?.getBoundingClientRect();
  if (target === "chariot")
    return {
      element,
      point: rect ? center(rect) : { x: window.innerWidth - 60, y: 32 },
      scale: 0.4,
      hit: [{ scale: "1" }, { scale: "1.5", rotate: "-14deg" }, { scale: "1" }],
    };
  const margin = box.height / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight;
  return {
    element: undefined,
    point: {
      x: box.left + box.width / 2,
      y: Math.min(Math.max(y, margin), window.innerHeight - margin),
    },
    scale: 0.7,
    hit: [],
  };
}

/** A throw: up first, then down onto the target, swelling at the top as if closer. */
function arc(from: Point, to: Point, endScale: number): Keyframe[] {
  const height = 110 + Math.abs(to.y - from.y) * 0.2;
  const steps = 24;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const x = (to.x - from.x) * t;
    const lifted = from.y + (to.y - from.y) * t - height * 4 * t * (1 - t);
    // Never above the screen: the ball would vanish mid-flight.
    const y = Math.max(lifted, 16) - from.y;
    const scale = 1 + (endScale - 1) * t + 0.35 * Math.sin(Math.PI * t);
    const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
    return { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity, offset: t };
  });
}

function popBox(box: HTMLElement | null | undefined) {
  box?.animate([{ scale: "1" }, { scale: "1.3" }, { scale: "1" }], {
    duration: 220,
    easing: "ease-out",
  });
}
