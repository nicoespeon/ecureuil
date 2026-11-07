import { foyerJournal, type MagasinSeed, seedMagasins } from "@ecureuil/domain";

/**
 * The journal of a foyer written as a plain list, one article a line: a leading `.` means
 * Costco (the rest is Maxi), a trailing `xN` the quantity, a repeated name counts once.
 * Every article is on the list; it keeps the seed's rayon when its name matches, and is
 * PasVenduIci in the other magasin.
 */
export function foyerEvents(liste: string) {
  const lignes = parseListe(liste);
  const magasins = seedMagasins.map((magasin) => ({
    ...magasin,
    placements: Object.fromEntries(
      lignes.flatMap(({ slug, magasin: own }) => {
        const placement = own === magasin.slug ? magasin.placements[slug] : "PasVenduIci";
        return placement === undefined ? [] : [[slug, placement]];
      }),
    ),
  }));
  return foyerJournal(
    {
      magasins,
      articles: Object.fromEntries(lignes.map(({ slug, name }) => [slug, name])),
      quantities: Object.fromEntries(
        lignes.flatMap(({ slug, quantity }) => (quantity === undefined ? [] : [[slug, quantity]])),
      ),
      onTheList: lignes.map(({ slug }) => slug),
    },
    "foyer",
  );
}

type Ligne = {
  readonly slug: string;
  readonly name: string;
  readonly magasin: MagasinSeed["slug"];
  readonly quantity: number | undefined;
};

const LIGNE = /^(?<costco>\.\s*)?(?<name>.*?)(?:\s+x(?<quantity>\d+))?$/u;

function parseListe(liste: string): ReadonlyArray<Ligne> {
  const seen = new Set<string>();
  return liste
    .split("\n")
    .map((raw) => raw.trim())
    .filter((line) => line !== "")
    .flatMap((line) => {
      const groups = LIGNE.exec(line)?.groups;
      const name = groups?.name;
      if (name === undefined || name === "") return [];
      const slug = slugOf(name);
      if (seen.has(slug)) return [];
      seen.add(slug);
      return [
        {
          slug,
          name,
          magasin: groups?.costco === undefined ? "maxi" : "costco",
          quantity: groups?.quantity === undefined ? undefined : Number(groups.quantity),
        },
      ];
    });
}

/** "Pâtes de Cecco" → "pates-de-cecco", the seed's own slug shape, so names meet its placements. */
function slugOf(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
