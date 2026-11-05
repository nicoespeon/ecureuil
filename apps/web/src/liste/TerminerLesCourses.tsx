import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { Liste } from "@ecureuil/domain";

export function TerminerLesCourses({
  liste,
  finishSortie,
}: {
  liste: Liste;
  finishSortie: () => void;
}) {
  const inPanier = liste.panier.length;
  const toBuy =
    liste.sections.reduce((count, section) => count + section.items.length, 0) +
    liste.pasVenduIci.length;

  return (
    <AlertDialog.Root>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-300 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-xl p-3">
          <AlertDialog.Trigger
            disabled={inPanier === 0}
            className={`${buttonClassName} w-full bg-neutral-900 text-white disabled:bg-neutral-300 disabled:text-neutral-700`}
          >
            Terminer les courses
          </AlertDialog.Trigger>
        </div>
      </div>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-40 flex w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 text-neutral-950 shadow-xl">
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
