import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { Liste } from "@ecureuil/domain";
import type { RefObject } from "react";

export function TerminerLesCourses({
  liste,
  finishSortie,
  focusAfterFinish,
}: {
  liste: Liste;
  finishSortie: () => void;
  /** The trigger disappears once the panier is empty, so focus goes here instead. */
  focusAfterFinish: RefObject<HTMLElement | null>;
}) {
  const inPanier = liste.panier.length;
  const toBuy =
    liste.sections.reduce((count, section) => count + section.items.length, 0) +
    liste.pasVenduIci.length;

  return (
    <AlertDialog.Root>
      {inPanier > 0 && (
        <AlertDialog.Trigger className={`${buttonClassName} flex-1 bg-neutral-900 text-white`}>
          Terminer les courses
        </AlertDialog.Trigger>
      )}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
        <AlertDialog.Popup
          finalFocus={() => (inPanier === 0 ? focusAfterFinish.current : true)}
          className="fixed top-1/2 left-1/2 z-40 flex w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 text-neutral-950 shadow-xl"
        >
          <AlertDialog.Title className="text-lg font-semibold">
            Terminer les courses ?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-neutral-800">
            {itemsInPanier(inPanier)}, {stillToBuy(toBuy)}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Close className={`${buttonClassName} border border-neutral-400`}>
              Annuler
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={finishSortie}
              className={`${buttonClassName} bg-neutral-900 text-white`}
            >
              Terminer
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const buttonClassName =
  "h-12 rounded-md px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const plural = new Intl.PluralRules("fr");

function itemsInPanier(count: number) {
  return plural.select(count) === "one"
    ? `${count} item dans le panier`
    : `${count} items dans le panier`;
}

function stillToBuy(count: number) {
  return plural.select(count) === "one" ? `${count} reste à acheter` : `${count} restent à acheter`;
}
