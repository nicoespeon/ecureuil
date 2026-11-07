import { Tooltip } from "@base-ui/react/tooltip";
import { type Tint, tintClassName } from "./magasinTint";
import type { Mode } from "./useMode";

/**
 * Off, the list is prepared at home; on, the courses are done in the magasin. Drawn, not written:
 * the house and the cart say the mode, the word stays its accessible name and its tooltip.
 */
export function CoursesSwitch({
  mode,
  setMode,
  tint,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** In the magasin, the track takes the magasin's hue. */
  tint: Tint;
}) {
  const on = mode === "courses";
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Courses"
        onClick={() => setMode(on ? "preparer" : "courses")}
        className="grid h-11 place-items-center rounded-full px-1 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <span
          aria-hidden="true"
          className={`clay-well relative block h-9 w-16 rounded-full motion-safe:transition-colors ${on ? tintClassName(tint).track : "bg-neutral-600"}`}
        >
          <span
            className={`clay absolute top-1 left-1 size-7 rounded-full motion-safe:transition-transform ${on ? "translate-x-7" : ""}`}
          />
          <HouseIcon className={`left-2.5 ${on ? "text-white" : "text-neutral-900"}`} />
          <CartIcon className={`left-[2.375rem] ${on ? "text-neutral-900" : "text-white"}`} />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4} className="z-30">
          <Tooltip.Popup className="rounded-lg bg-neutral-950 px-2 py-1 text-sm font-bold text-white">
            Courses
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const iconClassName = "absolute top-1/2 size-4 -translate-y-1/2 motion-safe:transition-colors";

/** Lucide `house`. */
function HouseIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${iconClassName} ${className}`}
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

/** Lucide `shopping-cart`. */
function CartIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${iconClassName} ${className}`}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
