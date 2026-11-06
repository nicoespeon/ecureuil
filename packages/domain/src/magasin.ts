import type { Event } from "@ecureuil/wire";

/** A new magasin starts with these, in a common walking order, to reorder or remove (ADR 1). */
const rayonsParDefaut = [
  "Fruits et légumes",
  "Boulangerie",
  "Viandes et poissons",
  "Produits laitiers",
  "Épicerie",
  "Surgelés",
  "Hygiène",
  "Entretien",
];

/**
 * The events that create a magasin with its default rayons. Pure: the caller gives the ids and
 * writes each draft to the journal, in order.
 */
export function magasinCreation({ name, newId }: { name: string; newId: () => string }) {
  const magasinId = newId();
  const drafts: ReadonlyArray<Draft> = [
    { type: "MagasinCreated", magasin: magasinId, payload: { name } },
    ...rayonsParDefaut.map((rayonName) => ({
      type: "RayonCreated" as const,
      magasin: magasinId,
      payload: { rayonId: newId(), name: rayonName },
    })),
  ];
  return { magasinId, drafts };
}

type Draft = Pick<
  Extract<Event, { type: "MagasinCreated" | "RayonCreated" }>,
  "type" | "magasin" | "payload"
>;
