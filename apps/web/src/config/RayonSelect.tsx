import type { Item, Magasin } from "@ecureuil/domain";
import { fieldClassName } from "./classNames";
import { currentRayonChoice, NON_CLASSE, PAS_VENDU_ICI, rayonChoiceOf } from "./rayonChoice";

/** A native select: the phone's own picker, and type-ahead on a keyboard. */
export function RayonSelect({
  id,
  item,
  magasin,
  label,
  setItemRayon,
}: {
  id?: string;
  item: Item;
  magasin: Magasin;
  label: string;
  setItemRayon: (magasinId: string, placement: { itemId: string; choice: string }) => void;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={currentRayonChoice(item, magasin.id)}
      onChange={(event) =>
        setItemRayon(magasin.id, { itemId: item.id, choice: event.currentTarget.value })
      }
      className={fieldClassName}
    >
      {magasin.rayons.map((rayon) => (
        <option key={rayon.id} value={rayonChoiceOf(rayon.id)}>
          {rayon.name}
        </option>
      ))}
      <option value={NON_CLASSE}>Non classé</option>
      <option value={PAS_VENDU_ICI}>Pas chez {magasin.name}</option>
    </select>
  );
}
