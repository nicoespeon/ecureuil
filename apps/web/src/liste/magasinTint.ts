/**
 * The header of each magasin takes a hue, to see at a glance where the list is sorted for.
 * Emerald stays the panier's, red the removal's, blue the focus ring's. Five hues far enough
 * apart on a pale background: a foyer has a few magasins, not more.
 */
const tints = ["indigo", "amber", "cyan", "fuchsia", "lime"] as const;

export type Tint = (typeof tints)[number];

const tintClassNames: Readonly<Record<Tint, { header: string; tab: string; track: string }>> = {
  indigo: {
    header: "bg-indigo-100 border-indigo-200",
    tab: "text-indigo-900",
    track: "bg-indigo-700",
  },
  amber: {
    header: "bg-amber-100 border-amber-200",
    tab: "text-amber-900",
    track: "bg-amber-700",
  },
  cyan: {
    header: "bg-cyan-100 border-cyan-200",
    tab: "text-cyan-900",
    track: "bg-cyan-700",
  },
  fuchsia: {
    header: "bg-fuchsia-100 border-fuchsia-200",
    tab: "text-fuchsia-900",
    track: "bg-fuchsia-700",
  },
  lime: {
    header: "bg-lime-100 border-lime-200",
    tab: "text-lime-900",
    track: "bg-lime-700",
  },
};

/**
 * By place in the tabs, not stored: up to five magasins never share a hue, and removing one
 * shifts the hue of those after it, a trade for no event in the journal.
 */
export function tintForTab(index: number) {
  return tints[index % tints.length] ?? "indigo";
}

export function tintClassName(tint: Tint) {
  return tintClassNames[tint];
}
