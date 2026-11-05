import { Dialog } from "@base-ui/react/dialog";
import type { Item, Magasin, State } from "@ecureuil/domain";
import { type RefObject, useId, useState } from "react";
import type { Journal } from "../journal/journal";
import { Stepper } from "../liste/ItemRow";
import { ConfirmButton } from "./ConfirmButton";
import { type ConfigActions, configActions } from "./configActions";
import { NameInput } from "./NameInput";
import { RayonSelect } from "./RayonSelect";
import { useAnnouncer } from "./useAnnouncer";

type Foyer = {
  readonly state: State;
  readonly magasins: ReadonlyArray<Magasin>;
  readonly magasinActif: Magasin;
};

/**
 * The item sheet, opened from the list or from the configuration. The trigger row disappears
 * when the item is removed: the focus then goes to `focusAfterRemove`.
 */
export function useFicheItem({
  foyer,
  journal,
  focusAfterRemove,
}: {
  foyer: Foyer;
  journal: Journal;
  focusAfterRemove: RefObject<HTMLElement | null>;
}) {
  const [itemId, setItemId] = useState<string | null>(null);
  const item = itemId === null ? undefined : foyer.state.items[itemId];
  const actions = configActions(journal, foyer.magasinActif.id);

  return {
    openFiche: (id: string) => setItemId(id),
    fiche: (
      <Dialog.Root open={item !== undefined} onOpenChange={(open) => open || setItemId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
          <Dialog.Popup
            finalFocus={() => (item === undefined ? focusAfterRemove.current : true)}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white text-neutral-950 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:shadow-xl"
          >
            {item && <FicheContent item={item} magasins={foyer.magasins} actions={actions} />}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  };
}

function FicheContent({
  item,
  magasins,
  actions,
}: {
  item: Item;
  magasins: ReadonlyArray<Magasin>;
  actions: ConfigActions;
}) {
  const nameId = useId();
  const toBuyId = useId();
  const rayonsId = useId();
  const { announcement, announce } = useAnnouncer();

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-neutral-300 px-4">
        <Dialog.Title className="min-w-0 flex-1 truncate text-lg font-semibold">
          {item.name}
        </Dialog.Title>
        <Dialog.Close className={closeClassName}>Fermer</Dialog.Close>
      </div>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className={labelClassName}>
            Nom
          </label>
          <NameInput
            id={nameId}
            name={item.name}
            rename={(name) => actions.renameItem(item.id, name)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={toBuyId} className="flex min-h-11 items-center gap-3 text-base">
            <input
              id={toBuyId}
              type="checkbox"
              checked={item.status !== "notToBuy"}
              onChange={(event) => actions.setToBuy(item.id, event.currentTarget.checked)}
              className="size-6 accent-neutral-900"
            />
            À acheter
          </label>
          <Stepper item={item} setQuantity={actions.setQuantity} />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className={`${labelClassName} mb-1`}>Rayon par magasin</legend>
          {magasins.map((magasin) => (
            <div key={magasin.id} className="flex flex-col gap-1">
              <label htmlFor={`${rayonsId}-${magasin.id}`} className="text-base">
                {magasin.name}
              </label>
              <RayonSelect
                id={`${rayonsId}-${magasin.id}`}
                item={item}
                magasin={magasin}
                label={`Rayon chez ${magasin.name}`}
                setItemRayon={actions.setItemRayon}
              />
            </div>
          ))}
        </fieldset>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
          <ConfirmButton
            subject={item.name}
            warning={{ announce, message: `Supprimer ${item.name} ?` }}
            onConfirm={() => actions.removeItem(item.id)}
            withLabel
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

const labelClassName = "text-sm font-medium text-neutral-800";

const closeClassName =
  "h-11 shrink-0 rounded-md px-3 text-base font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";
