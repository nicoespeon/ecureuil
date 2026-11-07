import { Dialog } from "@base-ui/react/dialog";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { fieldClassName, submitClassName } from "./classNames";

/**
 * Names a new magasin in a dialog. On creation the screen moves the focus to the new magasin,
 * so the dialog does not give it back to its trigger.
 */
export function NouveauMagasin({
  create,
  trigger,
}: {
  create: (name: string) => void;
  trigger: { className: string; label: ReactNode };
}) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const inputId = useId();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (typeof name !== "string" || name.trim() === "") return;
    setCreated(true);
    setOpen(false);
    create(name.trim());
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCreated(false);
      }}
    >
      <Dialog.Trigger className={trigger.className}>{trigger.label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-neutral-950/40" />
        <Dialog.Popup
          finalFocus={!created}
          className="fixed top-1/2 left-1/2 z-40 flex w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-neutral-50 p-6 text-neutral-950 shadow-xl"
        >
          <Dialog.Title className="text-xl font-black">Nouveau magasin</Dialog.Title>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-sm font-extrabold text-neutral-800">
                Nom
              </label>
              <input id={inputId} name="name" autoComplete="off" className={fieldClassName} />
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close className={cancelClassName}>Annuler</Dialog.Close>
              <button type="submit" className={submitClassName}>
                Créer
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const cancelClassName =
  "button-secondary text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
