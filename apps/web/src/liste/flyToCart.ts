/**
 * A checked box leaves its row as a ball and arcs to the cart of the header, which jumps when
 * hit: the row melts into the ball as it takes off. Called before the check, while the row still
 * stands where the finger hit it. Only a picture: the article goes to the panier at once, the
 * gestures that follow are never kept waiting. Nothing flies for who asks for less motion.
 */
export function flyToCart(box: HTMLElement | null | undefined) {
  const row = box?.closest("li");
  if (!box || !row || !canFly()) return;
  const from = { box: box.getBoundingClientRect(), row: row.getBoundingClientRect() };
  // The ball on top: the row melts under it.
  melt(overlay(ghostOf(row), { at: from.row, layer: UNDER_HEADINGS }), from);
  void throwBall(overlay(ballElement(), { at: from.box, layer: OVER_EVERYTHING }), from.box);
}

function canFly() {
  return (
    typeof Element.prototype.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The row as it looked, detached: React is about to move the real one to the panier. */
function ghostOf(row: HTMLElement) {
  const ghost = row.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) throw new Error("A row clones into an element");
  for (const element of [ghost, ...ghost.querySelectorAll("[id]")]) element.removeAttribute("id");
  ghost.querySelector("input")?.style.setProperty("visibility", "hidden");
  // A row just added would replay its highlight from the start.
  ghost.style.animation = "none";
  return ghost;
}

/** Lifted off the list as its own pebble, then squeezed into the box. */
function melt(ghost: HTMLElement, { box, row }: { box: DOMRect; row: DOMRect }) {
  Object.assign(ghost.style, {
    background: "white",
    borderRadius: "var(--radius-pebble)",
    boxShadow: "var(--shadow-raised)",
    transformOrigin: `${box.left - row.left + box.width / 2}px 50%`,
  });
  const animation = ghost.animate(
    [
      { transform: "none", opacity: 1 },
      { transform: "scale(1.03)", opacity: 1, offset: 0.25 },
      { opacity: 0.9, offset: 0.7 },
      { transform: `scale(${box.width / row.width}, ${box.height / row.height})`, opacity: 0 },
    ],
    { duration: 260, easing: "ease-in" },
  );
  const remove = () => ghost.remove();
  void animation.finished.then(remove, remove);
}

async function throwBall(ball: HTMLElement, box: DOMRect) {
  const cart = document.querySelector<HTMLElement>("[data-flight-target=cart]");
  if (!cart) {
    ball.remove();
    return;
  }
  const flight = ball.animate(arc(center(box), center(cart.getBoundingClientRect())), {
    duration: 760,
    easing: "cubic-bezier(0.2, 0.1, 0.6, 1)",
    fill: "both",
  });
  await flight.finished.catch(() => undefined);
  ball.remove();
  cart.animate([{ scale: "1" }, { scale: "1.5", rotate: "-14deg" }, { scale: "1" }], {
    duration: 320,
    easing: "ease-out",
  });
}

/**
 * The ghost stays under the sticky headings, as its row did; the ball flies over the header to
 * reach the cart.
 */
const UNDER_HEADINGS = "5";
const OVER_EVERYTHING = "40";

/** Out of the way of fingers and screen readers. */
function overlay(element: HTMLElement, { at, layer }: { at: DOMRect; layer: string }) {
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  Object.assign(element.style, {
    position: "fixed",
    left: `${at.left}px`,
    top: `${at.top}px`,
    width: `${at.width}px`,
    height: `${at.height}px`,
    margin: "0",
    zIndex: layer,
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

/** A throw: up and over, swelling at the top as if closer, small enough to drop in the cart. */
function arc(from: Point, to: Point): Keyframe[] {
  const height = 110 + Math.abs(to.y - from.y) * 0.2;
  const endScale = 0.4;
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
