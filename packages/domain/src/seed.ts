import { type Actor, Event, ItemRayon } from "@ecureuil/wire";
import { Schema } from "effect";

const items = {
  babybel: "Babybel",
  champignons: "Champignons",
  lait: "Lait",
  nutella: "Nutella",
  "pretzel-crisps": "Pretzel Crisps",
  "pyjama-polaire-gabriel": "Pyjama polaire Gabriel",
  shampooing: "Shampooing",
  yaourts: "Yaourts",
  "fromage-rape": "Fromage râpé",
  croissants: "Croissants",
  bananes: "Bananes",
  pommes: "Pommes",
  pain: "Pain",
  oeufs: "Œufs",
  beurre: "Beurre",
  pates: "Pâtes",
  riz: "Riz",
  cafe: "Café",
  "papier-toilette": "Papier toilette",
  "petits-pois": "Petits pois surgelés",
} as const;

type ItemSlug = keyof typeof items;

const quantities: Partial<Record<ItemSlug, number>> = { lait: 3 };

const onTheList: ReadonlyArray<ItemSlug> = [
  "babybel",
  "champignons",
  "lait",
  "nutella",
  "pretzel-crisps",
  "pyjama-polaire-gabriel",
  "shampooing",
  "yaourts",
  "fromage-rape",
  "croissants",
];

/**
 * Rayons in walking order. An item missing from `placements` stays NonClasse in that magasin.
 */
type MagasinSeed<RayonSlug extends string> = {
  readonly slug: string;
  readonly name: string;
  readonly rayons: Readonly<Record<RayonSlug, string>>;
  readonly placements: Partial<Record<ItemSlug, NoInfer<RayonSlug> | "PasVenduIci">>;
};

const costco = magasin({
  slug: "costco",
  name: "Costco",
  rayons: {
    vetements: "Vêtements",
    hygiene: "Hygiène",
    epicerie: "Épicerie",
    collations: "Collations",
    boulangerie: "Boulangerie",
    "fruits-legumes": "Fruits et légumes",
    "produits-laitiers": "Produits laitiers",
    surgeles: "Surgelés",
  },
  placements: {
    "pyjama-polaire-gabriel": "vetements",
    shampooing: "hygiene",
    "papier-toilette": "hygiene",
    nutella: "epicerie",
    pates: "epicerie",
    riz: "epicerie",
    cafe: "epicerie",
    "pretzel-crisps": "collations",
    pain: "boulangerie",
    champignons: "fruits-legumes",
    bananes: "fruits-legumes",
    pommes: "fruits-legumes",
    babybel: "produits-laitiers",
    lait: "produits-laitiers",
    yaourts: "produits-laitiers",
    oeufs: "produits-laitiers",
    beurre: "produits-laitiers",
    "petits-pois": "surgeles",
  },
});

const maxi = magasin({
  slug: "maxi",
  name: "Maxi",
  rayons: {
    "fruits-legumes": "Fruits et légumes",
    boulangerie: "Boulangerie",
    epicerie: "Épicerie",
    "sante-beaute": "Santé et beauté",
    "produits-laitiers": "Produits laitiers",
    surgeles: "Surgelés",
  },
  placements: {
    champignons: "fruits-legumes",
    bananes: "fruits-legumes",
    pommes: "fruits-legumes",
    pain: "boulangerie",
    croissants: "boulangerie",
    nutella: "epicerie",
    pates: "epicerie",
    riz: "epicerie",
    cafe: "epicerie",
    shampooing: "sante-beaute",
    "papier-toilette": "sante-beaute",
    babybel: "produits-laitiers",
    lait: "produits-laitiers",
    yaourts: "produits-laitiers",
    oeufs: "produits-laitiers",
    beurre: "produits-laitiers",
    "fromage-rape": "produits-laitiers",
    "petits-pois": "surgeles",
    "pyjama-polaire-gabriel": "PasVenduIci",
  },
});

const SEED_EPOCH = Date.UTC(2026, 10, 1, 12);
const MINUTE = 60_000;

const decodeEvent = Schema.decodeUnknownSync(Event);

/**
 * A populated foyer as a journal: replay it with `fold(seed)`. Deterministic (fixed ids,
 * epoch and device) so tests and agents get the same state on every run.
 */
export const seed: ReadonlyArray<Event> = toEvents(
  [
    ...magasinCreation(costco),
    ...magasinCreation(maxi),
    ...Object.entries(items).map(([slug, name]) =>
      draft("ItemCreated", null, { itemId: itemId(slug), name }),
    ),
    ...Object.entries(quantities).map(([slug, quantity]) =>
      draft("ItemQuantitySet", null, { itemId: itemId(slug), quantity }),
    ),
    ...itemPlacement(costco),
    ...itemPlacement(maxi),
    ...onTheList.map((slug) => draft("ItemMarkedToBuy", null, { itemId: itemId(slug) })),
    byInvite(
      draft("DemandeCreated", null, {
        demandeId: "demande-chocolat-chaud",
        name: "Chocolat chaud",
      }),
    ),
  ],
  { idPrefix: "seed", startAt: 0 },
);

/**
 * Past sorties, for the fréquents in dev only: kept out of `seed`, which the API's `seed`
 * command pushes to production. Their items are off the list, so the list of `seed` holds.
 */
export const seedSorties: ReadonlyArray<Event> = toEvents(
  [
    ...sortie(costco, ["bananes", "oeufs", "cafe", "papier-toilette"]),
    ...sortie(costco, ["bananes", "oeufs", "pates"]),
    ...sortie(costco, ["bananes", "riz"]),
    ...sortie(maxi, ["pain", "pommes", "beurre"]),
    ...sortie(maxi, ["pain", "pommes"]),
  ],
  { idPrefix: "seed-sortie", startAt: seed.length },
);

function sortie({ slug }: MagasinSeed<string>, achats: ReadonlyArray<ItemSlug>) {
  return [
    ...achats.flatMap((item) => [
      draft("ItemMarkedToBuy", null, { itemId: itemId(item) }),
      draft("ItemChecked", null, { itemId: itemId(item) }),
    ]),
    draft("SortieFinished", magasinId(slug), {}),
  ];
}

/** Ties `placements` to the magasin's own rayon slugs at compile time. */
function magasin<RayonSlug extends string>(definition: MagasinSeed<RayonSlug>) {
  return definition;
}

function magasinCreation({ slug, name, rayons }: MagasinSeed<string>) {
  return [
    draft("MagasinCreated", magasinId(slug), { name }),
    ...Object.entries(rayons).map(([rayonSlug, rayonName]) =>
      draft("RayonCreated", magasinId(slug), {
        rayonId: rayonId(slug, rayonSlug),
        name: rayonName,
      }),
    ),
  ];
}

function itemPlacement({ slug, placements }: MagasinSeed<string>) {
  return Object.entries(placements).map(([itemSlug, placement]) =>
    draft("ItemRayonSet", magasinId(slug), {
      itemId: itemId(itemSlug),
      rayon:
        placement === "PasVenduIci"
          ? ItemRayon.cases.PasVenduIci.make({})
          : ItemRayon.cases.Rayon.make({ rayonId: rayonId(slug, placement) }),
    }),
  );
}

function magasinId(slug: string) {
  return `magasin-${slug}`;
}

function rayonId(magasinSlug: string, rayonSlug: string) {
  return `rayon-${magasinSlug}-${rayonSlug}`;
}

function itemId(slug: string) {
  return `item-${slug}`;
}

type Draft = { type: Event["type"]; magasin: string | null; payload: unknown; actor: Actor };

function draft(type: Draft["type"], magasin: Draft["magasin"], payload: unknown) {
  return { type, magasin, payload, actor: "proprietaire" } satisfies Draft;
}

function byInvite(fields: Draft) {
  return { ...fields, actor: "invite" } satisfies Draft;
}

/**
 * Decoding through the wire contract keeps the fixture valid as the schema evolves. Each list
 * has its own id prefix, so a growing `seed` never collides with `seedSorties`.
 */
function toEvents(
  drafts: ReadonlyArray<Draft>,
  { idPrefix, startAt }: { idPrefix: string; startAt: number },
) {
  return drafts.map((fields, index) =>
    decodeEvent({
      id: `${idPrefix}-${String(index + 1).padStart(3, "0")}`,
      at: SEED_EPOCH + (startAt + index) * MINUTE,
      device: "seed",
      ...fields,
    }),
  );
}
