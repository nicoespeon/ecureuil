import type { Item, State } from "@ecureuil/domain";

const MAX_FREQUENT_ITEMS = 8;

/**
 * The items bought most often in this magasin, by number of sorties, that are not on the list
 * yet: what the empty search field suggests.
 */
export function frequentItems(state: State, magasinId: string) {
  const sortiesCount = state.sorties
    .filter((sortie) => sortie.magasin === magasinId)
    .flatMap((sortie) => sortie.achats.map((achat) => achat.itemId))
    .reduce(
      (counts, itemId) => counts.set(itemId, (counts.get(itemId) ?? 0) + 1),
      new Map<string, number>(),
    );

  return [...sortiesCount]
    .flatMap(([itemId, count]) => {
      const item = state.items[itemId];
      return item?.status === "notToBuy" ? [{ item, count }] : [];
    })
    .sort((a, b) => b.count - a.count || byName(a.item, b.item))
    .slice(0, MAX_FREQUENT_ITEMS)
    .map(({ item }) => item);
}

/**
 * The catalogue items whose name contains the query, ignoring accents and case, those starting
 * with it first. `nameToCreate` is the query when no item bears that exact name.
 */
export function searchItems(state: State, query: string) {
  const name = query.trim();
  const needle = searchable(name);
  if (needle === "") return { items: [], nameToCreate: null };

  const items = Object.values(state.items)
    .filter((item) => searchable(item.name).includes(needle))
    .sort(
      (a, b) =>
        Number(searchable(b.name).startsWith(needle)) -
          Number(searchable(a.name).startsWith(needle)) || byName(a, b),
    );
  const exists = items.some((item) => searchable(item.name) === needle);
  return { items, nameToCreate: exists ? null : name };
}

function searchable(text: string) {
  return text
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function byName(a: Item, b: Item) {
  return a.name.localeCompare(b.name, "fr");
}
