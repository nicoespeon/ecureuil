import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { LienResponse } from "@ecureuil/wire";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClassName, inputClassName, secondaryButtonClassName } from "./Accueil";

type Creation =
  | { readonly step: "idle" }
  | { readonly step: "creating" }
  | { readonly step: "created"; readonly lien: string }
  | { readonly step: "failed" };

/**
 * Creates Mariane's lien and shows it only this time. Replacing one asks first: her old one
 * stops working at once.
 */
export function NouveauLienMariane({
  invite,
  newInviteLien,
}: {
  invite: LienResponse["invite"];
  newInviteLien: () => Promise<string>;
}) {
  const [creation, setCreation] = useState<Creation>({ step: "idle" });

  const create = () => {
    setCreation({ step: "creating" });
    newInviteLien().then(
      (lien) => setCreation({ step: "created", lien }),
      () => setCreation({ step: "failed" }),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {invite === null ? (
        <button
          type="button"
          disabled={creation.step === "creating"}
          onClick={create}
          className={secondaryButtonClassName}
        >
          Créer le lien pour Mariane
        </button>
      ) : (
        <>
          <p>Un lien existe pour Mariane, créé le {createdOn(invite.createdAt)}</p>
          <RemplacerLeLien disabled={creation.step === "creating"} onConfirm={create} />
        </>
      )}
      <p role="status" className="text-sm">
        {creation.step === "creating" ? "Création du lien…" : ""}
      </p>
      {creation.step === "created" && <LienCree lien={creation.lien} />}
      {creation.step === "failed" && (
        <p role="alert" className="text-red-800">
          Le lien n'a pas pu être créé. Vérifiez la connexion et réessayez.
        </p>
      )}
    </div>
  );
}

function createdOn(at: number) {
  const date = new Date(at);
  const thisYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: thisYear ? undefined : "numeric",
  });
}

function RemplacerLeLien({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger disabled={disabled} className={secondaryButtonClassName}>
        Nouveau lien pour Mariane
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-40 flex w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 text-neutral-950 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold">
            Remplacer le lien de Mariane ?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-neutral-800">
            L'ancien cessera de marcher sur tous ses appareils.
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Close className={secondaryButtonClassName}>Annuler</AlertDialog.Close>
            <AlertDialog.Close onClick={onConfirm} className={buttonClassName}>
              Remplacer le lien
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function LienCree({ lien }: { lien: string }) {
  const [copy, setCopy] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Focus, not only select: the button that created the lien may have just left the page.
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-300 p-3">
      <label htmlFor={inputId} className="font-medium">
        Lien de Mariane
      </label>
      <input
        ref={inputRef}
        id={inputId}
        readOnly
        value={lien}
        onFocus={(event) => event.target.select()}
        className={inputClassName}
      />
      <button
        type="button"
        onClick={() =>
          navigator.clipboard.writeText(lien).then(
            () => setCopy("Lien copié"),
            () => setCopy("Copie impossible : sélectionnez le lien pour le copier."),
          )
        }
        className={buttonClassName}
      >
        Copier
      </button>
      <p role="status" className="text-sm">
        {copy}
      </p>
      <p className="text-neutral-700">Gardez-le quelque part : il ne sera plus affiché.</p>
    </div>
  );
}
