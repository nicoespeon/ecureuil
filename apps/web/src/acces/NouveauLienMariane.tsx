import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClassName, inputClassName, secondaryButtonClassName } from "./Accueil";

type Creation =
  | { readonly step: "idle" }
  | { readonly step: "creating" }
  | { readonly step: "created"; readonly lien: string }
  | { readonly step: "failed" };

/**
 * Replaces Mariane's lien: her old one stops working at once, so it asks first, and shows the
 * new one only this time.
 */
export function NouveauLienMariane({ newInviteLien }: { newInviteLien: () => Promise<string> }) {
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
      <AlertDialog.Root>
        <AlertDialog.Trigger
          disabled={creation.step === "creating"}
          className={secondaryButtonClassName}
        >
          Nouveau lien pour Mariane
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-40 flex w-96 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-white p-5 text-neutral-950 shadow-xl">
            <AlertDialog.Title className="text-lg font-semibold">
              Remplacer le lien de Mariane ?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-neutral-800">
              Son lien actuel cessera de marcher sur tous ses appareils. Il faudra lui donner le
              nouveau.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className={secondaryButtonClassName}>Annuler</AlertDialog.Close>
              <AlertDialog.Close onClick={create} className={buttonClassName}>
                Remplacer le lien
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {creation.step === "created" && <LienCree lien={creation.lien} />}
      {creation.step === "failed" && (
        <p role="alert" className="text-red-800">
          Le lien n'a pas pu être créé. Vérifiez la connexion et réessayez : l'ancien marche
          toujours.
        </p>
      )}
    </div>
  );
}

function LienCree({ lien }: { lien: string }) {
  const [copy, setCopy] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => inputRef.current?.select(), []);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-300 p-3">
      <label htmlFor={inputId} className="font-medium">
        Nouveau lien de Mariane
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
      <p className="text-neutral-700">
        L'ancien lien de Mariane ne marche plus. Rangez celui-ci dans votre 1Password partagé : il
        ne s'affichera plus.
      </p>
    </div>
  );
}
