/**
 * The header of each magasin takes a hue, to see at a glance where the list is sorted for.
 * Emerald stays the panier's, red the removal's, blue the focus ring's.
 */
const tints = ["amber", "orange", "sky", "indigo", "violet", "fuchsia", "cyan"] as const;

export type Tint = (typeof tints)[number];

const tintClassNames: Readonly<Record<Tint, { header: string; activeTab: string; track: string }>> =
  {
    amber: {
      header: "bg-amber-100 border-amber-700",
      activeTab: "data-active:border-amber-700",
      track: "bg-amber-700",
    },
    orange: {
      header: "bg-orange-100 border-orange-700",
      activeTab: "data-active:border-orange-700",
      track: "bg-orange-700",
    },
    sky: {
      header: "bg-sky-100 border-sky-700",
      activeTab: "data-active:border-sky-700",
      track: "bg-sky-700",
    },
    indigo: {
      header: "bg-indigo-100 border-indigo-700",
      activeTab: "data-active:border-indigo-700",
      track: "bg-indigo-700",
    },
    violet: {
      header: "bg-violet-100 border-violet-700",
      activeTab: "data-active:border-violet-700",
      track: "bg-violet-700",
    },
    fuchsia: {
      header: "bg-fuchsia-100 border-fuchsia-700",
      activeTab: "data-active:border-fuchsia-700",
      track: "bg-fuchsia-700",
    },
    cyan: {
      header: "bg-cyan-100 border-cyan-700",
      activeTab: "data-active:border-cyan-700",
      track: "bg-cyan-700",
    },
  };

/** Derived, not stored: two magasins may share a hue, a trade for no event in the journal. */
export function tintForMagasin(magasinId: string): Tint {
  const hash = [...magasinId].reduce(
    (sum, character) => (sum * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003,
    7,
  );
  return tints[hash % tints.length] ?? "amber";
}

export function tintClassName(tint: Tint) {
  return tintClassNames[tint];
}
