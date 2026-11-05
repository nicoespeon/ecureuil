import type { Item, Magasin, State } from "@ecureuil/domain";
import { useId, useState } from "react";
import { fieldClassName } from "./classNames";
import type { ConfigActions } from "./configActions";
import { RayonSelect } from "./RayonSelect";

export function ItemsView({
  magasin,
  items,
  actions,
}: {
  magasin: Magasin;
  items: State["items"];
  actions: Pick<ConfigActions, "setItemRayon"> & { readonly openFiche: (itemId: string) => void };
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const shown = Object.values(items)
    .filter((item) => matches(item, search))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div className="p-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <label htmlFor={searchId} className="text-sm font-medium text-neutral-800">
          Rechercher un item
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          autoComplete="off"
          className={fieldClassName}
        />
      </div>
      <ul aria-label="Items" className="mt-2 max-w-2xl">
        {shown.map((item) => (
          <li key={item.id} className="flex items-center gap-2 border-b border-neutral-200 py-1">
            <button
              type="button"
              onClick={() => actions.openFiche(item.id)}
              className="min-h-11 min-w-0 flex-1 rounded-md px-1 text-left text-base break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {item.name}
            </button>
            <div className="w-[48%] max-w-64 shrink-0">
              <RayonSelect
                item={item}
                magasin={magasin}
                label={`Rayon de ${item.name}`}
                setItemRayon={actions.setItemRayon}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function matches(item: Item, search: string) {
  return comparable(item.name).includes(comparable(search.trim()));
}

/** « rape » finds « Fromage râpé », « oeufs » finds « Œufs ». */
function comparable(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae");
}
