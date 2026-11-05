import type { Item } from "@ecureuil/domain";
import { ItemRayon } from "@ecureuil/wire";

/**
 * The value of a rayon `<select>`: one of the magasin's rayons, « Non classé » or « Pas chez X ».
 * Rayon ids are prefixed so none can pass for the two others.
 */
export const NON_CLASSE = "NonClasse";
export const PAS_VENDU_ICI = "PasVenduIci";
const RAYON_PREFIX = "rayon:";

export function rayonChoiceOf(rayonId: string) {
  return `${RAYON_PREFIX}${rayonId}`;
}

export function currentRayonChoice(item: Item, magasinId: string) {
  const itemRayon = item.rayonParMagasin[magasinId];
  if (itemRayon === undefined) return NON_CLASSE;
  return itemRayon._tag === "Rayon" ? rayonChoiceOf(itemRayon.rayonId) : PAS_VENDU_ICI;
}

export function itemRayonOf(choice: string) {
  if (choice === PAS_VENDU_ICI) return ItemRayon.cases.PasVenduIci.make({});
  if (choice.startsWith(RAYON_PREFIX))
    return ItemRayon.cases.Rayon.make({ rayonId: choice.slice(RAYON_PREFIX.length) });
  return ItemRayon.cases.NonClasse.make({});
}
